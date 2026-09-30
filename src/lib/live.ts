// Ephemeral, never-stored signals for one room over Supabase Realtime:
// "yazıyor…" (typing), who is in the voice call (presence), and the voice call's translated audio + live captions.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** 'paid' speakers relay translated audio; 'free' speakers' sentences are read aloud by the listener */
export interface CallMember {
  userId: string;
  engine: 'free' | 'paid';
}

export interface LiveHandlers {
  onTyping: (userId: string, typing: boolean) => void;
  /** Who is in the voice call (including me) and which engine they speak through */
  onCallMembers: (members: CallMember[]) => void;
  /** 24 kHz PCM16 (base64) of a partner's speech, already translated into my language */
  onAudio: (from: string, data: string) => void;
  /** What the partner is saying right now, translated; empty text clears the caption */
  onCaption: (from: string, text: string) => void;
}

export interface LiveChannel {
  setTyping: (typing: boolean) => void;
  setInCall: (inCall: boolean, engine?: 'free' | 'paid') => void;
  sendAudio: (data: string) => void;
  sendCaption: (text: string) => void;
  leave: () => void;
}

export function joinLiveChannel(roomId: string, userId: string, handlers: LiveHandlers): LiveChannel {
  let inCall = false;
  let engine: 'free' | 'paid' = 'free';
  let ready = false;

  const channel: RealtimeChannel = supabase.channel(`live:${roomId}`, {
    config: { presence: { key: userId }, broadcast: { self: false } },
  });

  const track = () => { if (ready) void channel.track({ inCall, engine }); };

  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => handlers.onTyping(payload.from, !!payload.typing))
    .on('broadcast', { event: 'audio' }, ({ payload }) => handlers.onAudio(payload.from, payload.data))
    .on('broadcast', { event: 'caption' }, ({ payload }) => handlers.onCaption(payload.from, payload.text ?? ''))
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ inCall?: boolean; engine?: 'free' | 'paid' }>();
      const members: CallMember[] = [];
      for (const id of Object.keys(state)) {
        const entry = state[id].find(p => p.inCall);
        if (entry) members.push({ userId: id, engine: entry.engine === 'paid' ? 'paid' : 'free' });
      }
      handlers.onCallMembers(members);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true;
        track();
      }
    });

  const send = (event: string, payload: Record<string, unknown>) => {
    if (ready) void channel.send({ type: 'broadcast', event, payload: { from: userId, ...payload } });
  };

  return {
    setTyping: (typing) => send('typing', { typing }),
    setInCall: (value, withEngine) => {
      inCall = value;
      if (withEngine) engine = withEngine;
      track();
    },
    sendAudio: (data) => send('audio', { data }),
    sendCaption: (text) => send('caption', { text }),
    leave: () => { void supabase.removeChannel(channel); },
  };
}
