// Data access for rooms, participants and messages (Supabase).
// Row level security limits every query to rooms the signed-in user belongs to.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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

/** The newest 500 messages of the room, oldest first */
export async function fetchMessages(roomId: string): Promise<MessageType[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as MessageType[]).reverse();
}

/** Asks the translate edge function to (re)translate a message; the result arrives via realtime.
 *  For my own voice messages, `spoken` is the translation the partner already heard. */
export async function requestTranslation(messageId: string, spoken?: string) {
  const { error } = await supabase.functions.invoke('translate', { body: { message_id: messageId, translation: spoken } });
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
  reply_to_id?: string | null;
  is_voice?: boolean;
}, spokenTranslation?: string): Promise<MessageType> {
  // Clamp target language to supported codes; fallback to opposite of source if unsupported
  const supported = ['tr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja', 'ko', 'th', 'tk'];
  let targetLang = msg.target_language;
  if (!supported.includes(targetLang)) {
    // default to opposite of source if source is tr/en, else default to en
    targetLang = msg.original_language === 'tr' ? 'en' : 'tr';
  }
  // An uploaded photo is a ~15 KB data URL: keep it on the participant row, not on every message
  const senderAvatar = msg.sender_avatar?.startsWith('data:') ? null : msg.sender_avatar;
  const { data, error } = await supabase.from('messages')
    .insert({ ...msg, sender_avatar: senderAvatar, target_language: targetLang }).select('*').single();
  if (error) throw error;
  void requestTranslation(data.id, spokenTranslation);
  return data as MessageType;
}

// ---------------------------------------------------------------------------
// VIP membership. VIP unlocks the paid voice engine; the live-token edge function enforces it.

/** 'members': VIP members only; 'everyone': VIP is free for all; 'off': free engine only */
export type VipAccess = 'members' | 'everyone' | 'off';

export interface VipStatus {
  access: VipAccess;
  /** End of my own VIP membership, if any */
  vipUntil: string | null;
  /** Whether I may start the VIP engine right now */
  canUseVip: boolean;
  /** Account balance in US dollars, topped up by the admin */
  balanceUsd: number;
  /** VIP talk time left in seconds, sent by the admin; runs down during VIP calls */
  vipSeconds: number;
}

export async function fetchVipStatus(userId: string): Promise<VipStatus> {
  const [{ data: setting }, { data: membership }] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'vip_access').maybeSingle(),
    supabase.from('memberships').select('vip_until, balance_usd, vip_seconds').eq('user_id', userId).maybeSingle(),
  ]);
  const access: VipAccess = setting?.value === 'everyone' || setting?.value === 'off' ? setting.value : 'members';
  const vipUntil = membership?.vip_until && new Date(membership.vip_until) > new Date() ? membership.vip_until : null;
  return {
    access, vipUntil, canUseVip: access === 'everyone' || (access === 'members' && (!!vipUntil || (membership?.vip_seconds ?? 0) > 0)),
    balanceUsd: Number(membership?.balance_usd ?? 0),
    vipSeconds: membership?.vip_seconds ?? 0,
  };
}

/** Fires when the admin grants me VIP (or my latest request is decided) */
export function subscribeToMembership(userId: string, onChange: () => void): () => void {
  // App and the Plans page listen at the same time. supabase.channel() hands back an existing channel with the
  // same name, and adding listeners to an already subscribed one throws (blank Plans page): keep names unique.
  const channel = supabase
    .channel(`membership:${userId}:${uuidv4()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships', filter: `user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vip_requests', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export interface VipRequest {
  id: string;
  user_id: string;
  user_name: string;
  kind: 'gift' | 'purchase';
  plan: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at: string | null;
}

/** A gift ("Hediyemiz var") or plan purchase request for the admin to approve */
export async function requestVip(kind: 'gift' | 'purchase', plan: string | null, name: string): Promise<'sent' | 'already_pending'> {
  const { data, error } = await supabase.rpc('request_vip', { p_kind: kind, p_plan: plan, p_name: name });
  if (error) throw error;
  return data;
}

export async function fetchMyLatestRequest(userId: string): Promise<VipRequest | null> {
  const { data } = await supabase
    .from('vip_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as VipRequest | null;
}

// Admin panel. Every call carries the PIN; the database checks it and counts wrong ones.

const adminError = (error: { message: string }) =>
  new Error(error.message.includes('too_many_attempts') ? 'too_many_attempts' : error.message);

/** Checks the admin PIN on the server. Throws 'too_many_attempts' after repeated wrong PINs. */
export async function adminCheckPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_check_pin', { p_pin: pin });
  if (error) throw adminError(error);
  return data === true;
}

export interface AdminUser {
  user_id: string;
  name: string;
  last_seen: string;
  vip_until: string | null;
  balance_usd: number;
  vip_seconds: number;
}

export interface AdminOverview {
  vip_access: VipAccess;
  vip_members: number;
  requests: VipRequest[];
  users: AdminUser[];
}

/** null when the PIN is wrong */
export async function adminOverview(pin: string): Promise<AdminOverview | null> {
  const { data, error } = await supabase.rpc('admin_overview', { p_pin: pin });
  if (error) throw adminError(error);
  return data as AdminOverview | null;
}

export async function adminSetVipAccess(pin: string, value: VipAccess): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_set_vip_access', { p_pin: pin, p_value: value });
  if (error) throw adminError(error);
  return data === true;
}

export interface RoomMember {
  user_id: string;
  name: string;
  last_seen: string;
  vip_until: string | null;
}

/** People in the room with this code. null when the PIN is wrong; throws 'room_not_found'. */
export async function adminRoomMembers(pin: string, code: string): Promise<RoomMember[] | null> {
  const { data, error } = await supabase.rpc('admin_room_members', { p_pin: pin, p_code: code });
  if (error) throw adminError(error);
  return data as RoomMember[] | null;
}

/** Gives p_days of VIP, added to any VIP time left */
export async function adminGrantVip(pin: string, userId: string, days: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_grant_vip', { p_pin: pin, p_user: userId, p_days: days });
  if (error) throw adminError(error);
  return data === true;
}

export async function adminDecideRequest(pin: string, id: string, approve: boolean, days: number | null): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_decide_request', { p_pin: pin, p_id: id, p_approve: approve, p_days: days });
  if (error) throw adminError(error);
  return data === true;
}

/** Adds dollars to a user's balance (a negative amount takes them back) */
export async function adminAddBalance(pin: string, userId: string, amount: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_add_balance', { p_pin: pin, p_user: userId, p_amount: amount });
  if (error) throw adminError(error);
  return data === true;
}

/** Sends hours of VIP usage to a user */
export async function adminGrantHours(pin: string, userId: string, hours: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_grant_hours', { p_pin: pin, p_user: userId, p_hours: hours });
  if (error) throw adminError(error);
  return data === true;
}

/** Shows a note to every user (empty text removes it) */
export async function adminSetAnnouncement(pin: string, text: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_set_announcement', { p_pin: pin, p_text: text });
  if (error) throw adminError(error);
  return data === true;
}

/** The admin's note to all users, '' when there is none. Readable signed out too. */
export async function fetchAnnouncement(): Promise<string> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'announcement').maybeSingle();
  return typeof data?.value === 'string' ? data.value : '';
}

/** Counts seconds of a VIP call against my talk time. Returns seconds left, or -1 when not metered. */
export async function consumeVipSeconds(seconds: number): Promise<number> {
  const { data, error } = await supabase.rpc('consume_vip_seconds', { p_seconds: Math.round(seconds) });
  if (error) throw error;
  return data as number;
}

/** Buys a package from my balance; VIP starts at once */
export async function buyWithBalance(plan: string): Promise<'ok' | 'insufficient' | 'invalid_plan'> {
  const { data, error } = await supabase.rpc('buy_with_balance', { p_plan: plan });
  if (error) throw error;
  return data as 'ok' | 'insufficient' | 'invalid_plan';
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
  /** Fires on every (re)connect; events sent while disconnected are lost, so callers resync here */
  onSubscribed?: () => void;
}): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`room:${roomId}:${uuidv4()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onMessageInsert(payload.new as MessageType))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onMessageUpdate(payload.new as MessageType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
      () => handlers.onParticipantsChange())
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onSubscribed?.();
    });
  return () => { void supabase.removeChannel(channel); };
}
