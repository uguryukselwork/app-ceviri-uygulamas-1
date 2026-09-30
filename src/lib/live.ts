// Ephemeral, never-stored signals for one room over Supabase Realtime:
// "yazıyor…" (typing), who is in the voice call (presence), and the voice call's translated audio + live captions.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface LiveHandlers {
  onTyping: (userId: string, typing: boolean) => void;
  /** User ids currently in the voice call, including me */
  onCallMembers: (userIds: string[]) => void;
  /** 24 kHz PCM16 (base64) of a partner's speech, already translated into my language */
  onAudio: (from: string, data: string) => void;
  /** What the partner is saying right now, translated; empty text clears the caption */
  onCaption: (from: string, text: string) => void;
}

export interface LiveChannel {
  setTyping: (typing: boolean) => void;
  setInCall: (inCall: boolean) => void;
  sendAudio: (data: string) => void;
  sendCaption: (text: string) => void;
  leave: () => void;
}

export function joinLiveChannel(roomId: string, userId: string, handlers: LiveHandlers): LiveChannel {
  let inCall = false;
  let ready = false;

  const channel: RealtimeChannel = supabase.channel(`live:${roomId}`, {
    config: { presence: { key: userId }, broadcast: { self: false } },
  });

  const track = () => { if (ready) void channel.track({ inCall }); };

  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => handlers.onTyping(payload.from, !!payload.typing))
    .on('broadcast', { event: 'audio' }, ({ payload }) => handlers.onAudio(payload.from, payload.data))
    .on('broadcast', { event: 'caption' }, ({ payload }) => handlers.onCaption(payload.from, payload.text ?? ''))
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ inCall?: boolean }>();
      handlers.onCallMembers(Object.keys(state).filter(id => state[id].some(p => p.inCall)));
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
    setInCall: (value) => { inCall = value; track(); },
    sendAudio: (data) => send('audio', { data }),
    sendCaption: (text) => send('caption', { text }),
    leave: () => { void supabase.removeChannel(channel); },
  };
}
