import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// One shared AudioContext: browsers cap how many can exist, so a new one per sound eventually fails
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
};

// Audio may only start after a user gesture; iOS also wants a sound started inside that gesture
const unlockAudio = () => {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'running') return;
  void ctx.resume().catch(() => {});
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
};

/** Keeps the shared AudioContext awake: unlocks on any tap/key and resumes when the app returns to the foreground */
export const installAudioUnlock = () => {
  if (typeof window === 'undefined') return;
  for (const event of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(event, unlockAudio, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlockAudio();
  });
};

type Note = { freq: number; at: number; dur: number; gain: number; wave?: OscillatorType; slideTo?: number };

export const SOUND_PATTERNS: Record<string, Note[]> = {
  pop: [{ freq: 600, slideTo: 220, at: 0, dur: 0.12, gain: 0.4 }],
  chime: [
    { freq: 784, at: 0, dur: 0.3, gain: 0.3, wave: 'triangle' },
    { freq: 1046.5, at: 0.1, dur: 0.4, gain: 0.3, wave: 'triangle' },
  ],
  bell: [
    { freq: 1174.66, at: 0, dur: 0.7, gain: 0.25 },
    { freq: 2349.32, at: 0, dur: 0.35, gain: 0.07 },
  ],
  digital: [
    { freq: 880, at: 0, dur: 0.07, gain: 0.25 },
    { freq: 1320, at: 0.08, dur: 0.07, gain: 0.25 },
  ],
  drop: [{ freq: 380, slideTo: 1400, at: 0, dur: 0.16, gain: 0.35 }],
  marimba: [
    { freq: 659.25, at: 0, dur: 0.35, gain: 0.35 },
    { freq: 2637, at: 0, dur: 0.06, gain: 0.08 },
    { freq: 987.77, at: 0.12, dur: 0.4, gain: 0.3 },
    { freq: 3951, at: 0.12, dur: 0.06, gain: 0.06 },
  ],
  harp: [
    { freq: 523.25, at: 0, dur: 0.5, gain: 0.2, wave: 'triangle' },
    { freq: 659.25, at: 0.07, dur: 0.5, gain: 0.2, wave: 'triangle' },
    { freq: 783.99, at: 0.14, dur: 0.5, gain: 0.2, wave: 'triangle' },
    { freq: 1046.5, at: 0.21, dur: 0.6, gain: 0.2, wave: 'triangle' },
  ],
  crystal: [
    { freq: 1568, at: 0, dur: 0.25, gain: 0.2 },
    { freq: 2093, at: 0.09, dur: 0.3, gain: 0.2 },
    { freq: 2637, at: 0.18, dur: 0.45, gain: 0.15 },
  ],
};

const playNotes = (ctx: AudioContext, notes: Note[], volume: number) => {
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.02;
  for (const n of notes) {
    const start = t0 + n.at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.wave ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, start + n.dur);
    // Exponential ramps can't touch 0, so fade between tiny values
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(n.gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + n.dur + 0.05);
  }
};

export const playNotificationSound = (type: string = 'pop', volume: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = SOUND_PATTERNS[type] ?? SOUND_PATTERNS.pop;
    // Schedule only once the context is actually running, otherwise the notes are silently dropped
    if (ctx.state === 'running') playNotes(ctx, notes, volume);
    else ctx.resume().then(() => playNotes(ctx, notes, volume)).catch(() => {});
  } catch (e) {
    console.error('Failed to play sound', e);
  }
};

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = error => reject(error);
  });
};
