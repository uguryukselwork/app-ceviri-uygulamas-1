// Data access for rooms, participants and messages (Supabase).
// Row level security limits every query to rooms the signed-in user belongs to.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { MessageType } from '../components/ChatMessage';

export interface Room {
  id: string;
  code: string;
}

export interface Participant {
  room_id: string;
  user_id: string;
  name: string;
  gender: 'male' | 'female' | null;
  language: string;
  avatarUrl: string | null;
  status: string;
}

export interface ParticipantInput {
  name: string;
  gender: 'male' | 'female' | null;
  language: string;
  avatarUrl?: string | null;
  status?: string;
}

const toParticipant = (row: any): Participant => ({ ...row, avatarUrl: row.avatar_url ?? null });

/** Finds a room by its invite code, or null when no room has that code */
export async function findRoom(code: string): Promise<Room | null> {
  const { data, error } = await supabase.rpc('find_room', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return (data as Room[] | null)?.[0] ?? null;
}

/** Creates a room with the given code; returns null if the code is already taken */
export async function createRoom(code: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').insert({ code }).select('id, code').single();
  if (error) {
    if (error.code === '23505') return null; // unique violation: try another code
    throw error;
  }
  return data;
}

/** Joins the room as the current user, or refreshes the user's name/language/photo in it */
export async function upsertParticipant(roomId: string, userId: string, p: ParticipantInput) {
  const { error } = await supabase.from('participants').upsert(
    {
      room_id: roomId,
      user_id: userId,
      name: p.name,
      gender: p.gender,
      language: p.language,
      avatar_url: p.avatarUrl || null,
      status: p.status || 'online',
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'room_id,user_id' }
  );
  if (error) throw error;
}

export async function fetchParticipants(roomId: string): Promise<Participant[]> {
  const { data, error } = await supabase.from('participants').select('*').eq('room_id', roomId);
  if (error) throw error;
  return (data ?? []).map(toParticipant);
}

export async function fetchMessages(roomId: string): Promise<MessageType[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as MessageType[];
}

/** Asks the translate edge function to (re)translate a message; the result arrives via realtime */
export async function requestTranslation(messageId: string) {
  const { error } = await supabase.functions.invoke('translate', { body: { message_id: messageId } });
  if (error) console.error('Translation request failed', error);
}

export async function sendMessage(msg: {
  room_id: string;
  sender_name: string;
  sender_gender: string | null;
  sender_avatar: string | null;
  original_text: string;
  original_language: string;
  target_language: string;
}): Promise<MessageType> {
  const { data, error } = await supabase.from('messages').insert(msg).select('*').single();
  if (error) throw error;
  void requestTranslation(data.id);
  return data as MessageType;
}

export async function markMessagesRead(roomId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .eq('is_read', false);
  if (error) console.error('Mark read failed', error);
}

/** Live updates for one room. Returns a function that unsubscribes. */
export function subscribeToRoom(roomId: string, handlers: {
  onMessageInsert: (m: MessageType) => void;
  onMessageUpdate: (m: MessageType) => void;
  onParticipantsChange: () => void;
}): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onMessageInsert(payload.new as MessageType))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onMessageUpdate(payload.new as MessageType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
      () => handlers.onParticipantsChange())
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
