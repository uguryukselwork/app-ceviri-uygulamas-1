// Live voice translation ("sesli çeviri"), phone-call style.
// My microphone streams to Gemini Live Translate, which returns my speech translated into the partner's
// language as audio (relayed to the partner) plus both transcripts (saved as a chat message per sentence).
import type { Session } from '@google/genai';
import { supabase } from './supabase';
import { getAudioContext } from './utils';

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
/** Silence after the last transcript before the sentence is saved as a message */
const SEGMENT_IDLE_MS = 1300;
/** Translated audio is relayed in ~200 ms batches to keep the realtime message rate low */
const RELAY_INTERVAL_MS = 200;

const toBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

/** Plays 24 kHz PCM16 chunks back to back */
export class PcmPlayer {
  private nextTime = 0;
  private endsAt = 0;

  play(b64: string, volume = 1) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    const bytes = fromBase64(b64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
    if (!pcm.length) return;
    const buffer = ctx.createBuffer(1, pcm.length, OUTPUT_RATE);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    // A small lead keeps network jitter from causing gaps
    const start = Math.max(this.nextTime, ctx.currentTime + 0.08);
    src.start(start);
    this.nextTime = start + buffer.duration;
    this.endsAt = performance.now() + (this.nextTime - ctx.currentTime) * 1000;
  }

  /** True while partner audio is (about to be) heard, plus a short tail for room echo */
  get isPlaying() {
    return performance.now() < this.endsAt + 350;
  }

  reset() {
    this.nextTime = 0;
    this.endsAt = 0;
  }
}

const WORKLET = `
class LtCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('lt-capture', LtCapture);`;
const workletLoaded = new WeakSet<AudioContext>();

/** Downsamples mic audio to 16 kHz PCM16 and hands out ~100 ms chunks */
class Downsampler {
  private pos = 0;
  private out: number[] = [];
  constructor(private ratio: number, private onChunk: (pcm: Int16Array) => void) {}

  push(input: Float32Array) {
    while (this.pos < input.length) {
      const start = Math.floor(this.pos);
      const end = Math.min(input.length, Math.floor(this.pos + this.ratio));
      let sum = 0;
      for (let i = start; i < end; i++) sum += input[i];
      const s = end > start ? sum / (end - start) : input[start];
      this.out.push(Math.max(-1, Math.min(1, s)) * 0x7fff);
      this.pos += this.ratio;
    }
    this.pos -= input.length;
    if (this.out.length >= INPUT_RATE / 10) {
      this.onChunk(Int16Array.from(this.out));
      this.out = [];
    }
  }
}

export type VoiceState = 'connecting' | 'live' | 'error';

export interface VoiceOptions {
  roomId: string;
  /** Language my speech is translated into (the partner's) */
  targetLanguage: string;
  /** Mic audio is held back while this returns true, so the partner's voice from my speaker is not re-translated */
  isHearingPartner: () => boolean;
  onState: (state: VoiceState, error?: string) => void;
  /** Translated audio to relay to the partner */
  onAudio: (b64: string) => void;
  /** Running translated caption of the current sentence ('' when it ends) */
  onCaption: (translated: string, original: string) => void;
  /** A finished sentence: what I said and how it was translated */
  onSentence: (original: string, translated: string, detectedLanguage?: string) => void;
}

export class VoiceTranslator implements VoiceEngine {
  private session: Session | null = null;
  private stream: MediaStream | null = null;
  private nodes: AudioNode[] = [];
  private active = false;
  private muted = false;
  private original = '';
  private translated = '';
  private detected?: string;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private relay: Uint8Array[] = [];
  private relayTimer: ReturnType<typeof setInterval> | null = null;
  private retries = 0;

  constructor(private opts: VoiceOptions) {}

  async start() {
    this.active = true;
    this.opts.onState('connecting');
    try {
      const ctx = getAudioContext();
      if (!ctx) throw new Error('Bu tarayıcı ses desteklemiyor');
      await ctx.resume().catch(() => {});

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      if (!this.active) return this.release();

      if (!workletLoaded.has(ctx)) {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        workletLoaded.add(ctx);
      }
      const source = ctx.createMediaStreamSource(this.stream);
      const capture = new AudioWorkletNode(ctx, 'lt-capture');
      const sink = ctx.createGain();
      sink.gain.value = 0; // keeps the worklet pulled without playing my own voice back
      source.connect(capture).connect(sink).connect(ctx.destination);
      this.nodes = [source, capture, sink];

      const downsampler = new Downsampler(ctx.sampleRate / INPUT_RATE, (pcm) => {
        if (!this.session || this.muted || this.opts.isHearingPartner()) return;
        this.session.sendRealtimeInput({
          audio: { data: toBase64(new Uint8Array(pcm.buffer)), mimeType: `audio/pcm;rate=${INPUT_RATE}` },
        });
      });
      capture.port.onmessage = (e) => downsampler.push(e.data as Float32Array);

      this.relayTimer = setInterval(() => this.flushRelay(), RELAY_INTERVAL_MS);
      await this.connect();
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Mikrofon izni verilmedi'
        : err instanceof Error ? err.message : String(err);
      this.opts.onState('error', message);
      this.stop();
    }
  }

  private async connect() {
    const { data, error } = await supabase.functions.invoke('live-token', {
      body: { room_id: this.opts.roomId, target_language: this.opts.targetLanguage },
    });
    if (error || !data?.token) throw new Error('Sesli çeviri başlatılamadı');
    if (!this.active) return;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: data.token, httpOptions: { apiVersion: 'v1alpha' } });
    this.session = await ai.live.connect({
      model: data.model,
      config: data.config,
      callbacks: {
        onopen: () => {
          this.retries = 0;
          this.opts.onState('live');
        },
        onmessage: (msg) => {
          const c = msg.serverContent;
          if (!c) return;
          for (const part of c.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) this.relay.push(fromBase64(part.inlineData.data));
          }
          let changed = false;
          if (c.inputTranscription?.text) {
            this.original += c.inputTranscription.text;
            if (c.inputTranscription.languageCode) this.detected = c.inputTranscription.languageCode;
            changed = true;
          }
          if (c.outputTranscription?.text) {
            this.translated += c.outputTranscription.text;
            changed = true;
          }
          if (changed) {
            this.opts.onCaption(this.translated.trim(), this.original.trim());
            this.scheduleSentenceEnd();
          }
        },
        onerror: (e) => console.warn('Live translate error', e),
        onclose: () => {
          this.session = null;
          // Sessions end after ~10 minutes or on network drops; reconnect while the call is on
          if (!this.active) return;
          if (this.retries++ >= 3) {
            this.opts.onState('error', 'Bağlantı koptu');
            this.stop();
            return;
          }
          this.opts.onState('connecting');
          setTimeout(() => {
            if (this.active) this.connect().catch((err) => {
              this.opts.onState('error', err instanceof Error ? err.message : String(err));
              this.stop();
            });
          }, 500 * this.retries);
        },
      },
    });
    if (!this.active) this.session.close();
  }

  private scheduleSentenceEnd() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.finishSentence(), SEGMENT_IDLE_MS);
  }

  private finishSentence() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const original = this.original.trim();
    const translated = this.translated.trim();
    this.original = '';
    this.translated = '';
    this.opts.onCaption('', '');
    if (original) this.opts.onSentence(original, translated, this.detected);
  }

  private flushRelay() {
    if (!this.relay.length) return;
    const total = this.relay.reduce((n, b) => n + b.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const b of this.relay) { merged.set(b, offset); offset += b.length; }
    this.relay = [];
    this.opts.onAudio(toBase64(merged));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    // Tell Gemini the speaker paused so the current sentence is flushed right away
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }

  private release() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.nodes.forEach(n => { try { n.disconnect(); } catch { /* already gone */ } });
    this.nodes = [];
  }

  stop() {
    if (!this.active && !this.stream && !this.session) return;
    this.active = false;
    this.flushRelay();
    if (this.relayTimer) clearInterval(this.relayTimer);
    this.relayTimer = null;
    if (this.original.trim()) this.finishSentence();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.release();
    this.session?.close();
    this.session = null;
  }
}

// ---------------------------------------------------------------------------
// Free mode: the browser's own speech recognition and speech synthesis.
// My speech becomes text, goes through the normal text translation, and the partner's phone reads it aloud.

export type VoiceMode = 'free' | 'paid';

/** Both engines share this shape so the room does not care which one runs */
export interface VoiceEngine {
  start(): Promise<void>;
  stop(): void;
  setMuted(muted: boolean): void;
}

const SPEECH_LOCALES: Record<string, string> = {
  tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT',
  ru: 'ru-RU', ar: 'ar-SA', ja: 'ja-JP', ko: 'ko-KR', th: 'th-TH', tk: 'tk-TM',
};
const speechLocale = (lang: string) => SPEECH_LOCALES[lang] || lang;

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(): void; abort(): void;
};
const recognitionCtor = (): (new () => Recognition) | null =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

export const isFreeVoiceSupported = () => typeof window !== 'undefined' && !!recognitionCtor() && 'speechSynthesis' in window;

export interface BrowserVoiceOptions {
  /** My language: what the recognizer listens for */
  language: string;
  onState: (state: VoiceState, error?: string) => void;
  /** What I am saying right now, before it is final */
  onCaption: (original: string) => void;
  /** A finished sentence in my language */
  onSentence: (original: string) => void;
}

export class BrowserVoiceTranslator implements VoiceEngine {
  private rec: Recognition | null = null;
  private active = false;
  private muted = false;
  private held = false;
  private running = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private opts: BrowserVoiceOptions) {}

  async start() {
    const Ctor = recognitionCtor();
    if (!Ctor || !('speechSynthesis' in window)) {
      this.opts.onState('error', 'Bu tarayıcı sesli çeviriyi desteklemiyor');
      return;
    }
    this.active = true;
    this.opts.onState('connecting');
    unlockSpeech();

    const rec = new Ctor();
    rec.lang = speechLocale(this.opts.language);
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { this.running = true; this.opts.onState('live'); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        if (e.results[i].isFinal) {
          this.opts.onCaption('');
          this.opts.onSentence(text);
        } else {
          interim += (interim ? ' ' : '') + text;
        }
      }
      if (interim) this.opts.onCaption(interim);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.opts.onState('error', 'Mikrofon izni verilmedi');
        this.stop();
      } else if (e.error === 'language-not-supported') {
        this.opts.onState('error', 'Bu dil tarayıcıda tanınmıyor');
        this.stop();
      }
      // 'no-speech', 'aborted', 'network': onend restarts it
    };
    // Phones stop listening after a pause; keep it going for the whole call
    rec.onend = () => {
      this.running = false;
      this.opts.onCaption('');
      this.scheduleRestart();
    };
    this.rec = rec;
    this.resume();
  }

  private get shouldListen() {
    return this.active && !this.muted && !this.held;
  }

  private resume() {
    if (!this.rec || this.running || !this.shouldListen) return;
    try { this.rec.start(); } catch { /* already starting */ }
  }

  private scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => this.resume(), 250);
  }

  private pause() {
    if (this.rec && this.running) this.rec.abort();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.pause(); else this.resume();
  }

  /** Stop listening while the partner's translation is read aloud, so my mic does not pick it up */
  setHeld(held: boolean) {
    this.held = held;
    if (held) this.pause(); else this.scheduleRestart();
  }

  stop() {
    this.active = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.pause();
    this.rec = null;
    window.speechSynthesis?.cancel();
  }
}

/** iOS only speaks after speech was started inside a tap; call from the tap that joins the call */
export function unlockSpeech() {
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch { /* no speech synthesis */ }
}

/** Reads text aloud in the given language; resolves when done */
export function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text.trim()) return resolve();
    const locale = speechLocale(lang);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === locale) || voices.find(v => v.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
