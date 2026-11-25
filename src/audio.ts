import track1 from '../asserts/music/ogg/01_paper_submission.ogg';
import track2 from '../asserts/music/ogg/02_midnight_lab.ogg';
import track3 from '../asserts/music/ogg/03_reviewer_1_cross_examination.ogg';
import track4 from '../asserts/music/ogg/04_reviewer_2_final_rebuttal.ogg';
import track5 from '../asserts/music/ogg/05_paper_accepted.ogg';
import track6 from '../asserts/music/ogg/06_paper_rejected.ogg';

export type SfxName =
  | 'click'
  | 'play'
  | 'hit'
  | 'block'
  | 'shield'
  | 'challenge_success'
  | 'challenge_fail'
  | 'accept'
  | 'turn'
  | 'win'
  | 'lose'
  | 'peek'
  | 'draw';

export type TrackId =
  | 'paper_submission'
  | 'midnight_lab'
  | 'reviewer1'
  | 'reviewer2'
  | 'accepted'
  | 'rejected';

export type SceneKey =
  | 'menu'
  | 'paper_submission'
  | 'route_map'
  | 'random_event'
  | 'card_reward'
  | 'battle1'
  | 'battle2'
  | 'run_summary_accept'
  | 'run_summary_weak_accept'
  | 'run_summary_reject';

interface TrackMeta {
  id: TrackId;
  url: string;
  loop: boolean;
}

const TRACKS: Record<TrackId, TrackMeta> = {
  paper_submission: { id: 'paper_submission', url: track1, loop: true },
  midnight_lab: { id: 'midnight_lab', url: track2, loop: true },
  reviewer1: { id: 'reviewer1', url: track3, loop: true },
  reviewer2: { id: 'reviewer2', url: track4, loop: true },
  accepted: { id: 'accepted', url: track5, loop: false },
  rejected: { id: 'rejected', url: track6, loop: false },
};

export const SCENE_TRACK: Record<SceneKey, TrackId> = {
  menu: 'paper_submission',
  paper_submission: 'paper_submission',
  route_map: 'midnight_lab',
  random_event: 'midnight_lab',
  card_reward: 'midnight_lab',
  battle1: 'reviewer1',
  battle2: 'reviewer2',
  run_summary_accept: 'accepted',
  run_summary_weak_accept: 'accepted',
  run_summary_reject: 'rejected',
};

type Note = { f: number; d: number; t?: number; type?: OscillatorType; v?: number; slide?: number };

const SFX: Record<SfxName, Note[]> = {
  click: [{ f: 880, d: 0.04, type: 'square', v: 0.08 }],
  play: [
    { f: 300, d: 0.06, type: 'triangle', v: 0.15, slide: 600 },
    { f: 600, d: 0.06, t: 0.06, type: 'triangle', v: 0.12 },
  ],
  hit: [
    { f: 180, d: 0.15, type: 'sawtooth', v: 0.18, slide: 60 },
    { f: 90, d: 0.12, t: 0.03, type: 'square', v: 0.12 },
  ],
  block: [
    { f: 1200, d: 0.05, type: 'square', v: 0.1 },
    { f: 900, d: 0.12, t: 0.05, type: 'triangle', v: 0.12 },
  ],
  shield: [
    { f: 440, d: 0.08, type: 'triangle', v: 0.12 },
    { f: 660, d: 0.08, t: 0.08, type: 'triangle', v: 0.12 },
    { f: 880, d: 0.12, t: 0.16, type: 'triangle', v: 0.12 },
  ],
  challenge_success: [
    { f: 523, d: 0.08, type: 'square', v: 0.12 },
    { f: 659, d: 0.08, t: 0.08, type: 'square', v: 0.12 },
    { f: 784, d: 0.08, t: 0.16, type: 'square', v: 0.12 },
    { f: 1046, d: 0.2, t: 0.24, type: 'square', v: 0.12 },
  ],
  challenge_fail: [
    { f: 392, d: 0.12, type: 'square', v: 0.12 },
    { f: 330, d: 0.12, t: 0.12, type: 'square', v: 0.12 },
    { f: 220, d: 0.3, t: 0.24, type: 'square', v: 0.12, slide: 180 },
  ],
  accept: [
    { f: 660, d: 0.07, type: 'triangle', v: 0.1 },
    { f: 880, d: 0.1, t: 0.07, type: 'triangle', v: 0.1 },
  ],
  turn: [
    { f: 392, d: 0.08, type: 'triangle', v: 0.1 },
    { f: 523, d: 0.12, t: 0.08, type: 'triangle', v: 0.1 },
  ],
  win: [
    { f: 523, d: 0.12, type: 'square', v: 0.12 },
    { f: 659, d: 0.12, t: 0.12, type: 'square', v: 0.12 },
    { f: 784, d: 0.12, t: 0.24, type: 'square', v: 0.12 },
    { f: 1046, d: 0.45, t: 0.36, type: 'square', v: 0.12 },
    { f: 784, d: 0.45, t: 0.36, type: 'triangle', v: 0.1 },
  ],
  lose: [
    { f: 392, d: 0.2, type: 'square', v: 0.12 },
    { f: 370, d: 0.2, t: 0.2, type: 'square', v: 0.12 },
    { f: 349, d: 0.2, t: 0.4, type: 'square', v: 0.12 },
    { f: 330, d: 0.6, t: 0.6, type: 'square', v: 0.12, slide: 200 },
  ],
  peek: [
    { f: 700, d: 0.05, type: 'sine', v: 0.12 },
    { f: 1000, d: 0.05, t: 0.07, type: 'sine', v: 0.12 },
  ],
  draw: [{ f: 500, d: 0.05, type: 'triangle', v: 0.1, slide: 800 }],
};

const CROSSFADE = 0.6;

interface PlayingTrack {
  id: TrackId;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  fading: boolean;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private decoded = new Map<TrackId, AudioBuffer>();
  private decoding = new Map<TrackId, Promise<AudioBuffer | null>>();
  private current: PlayingTrack | null = null;
  private currentScene: SceneKey | null = null;
  private jingleTimeout: number | null = null;

  sfxEnabled = true;
  musicEnabled = true;
  bgmVolume = 0.3;
  sfxVolume = 0.8;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = this.bgmVolume;
      this.bgmBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.sfxBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  unlock() {
    this.ensure();
    if (this.musicEnabled && this.currentScene) {
      const scene = this.currentScene;
      this.currentScene = null;
      this.setScene(scene);
    }
  }

  private tone(n: Note, base: number, dest: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const start = base + (n.t ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? 'square';
    osc.frequency.setValueAtTime(n.f, start);
    if (n.slide) osc.frequency.linearRampToValueAtTime(n.slide, start + n.d);
    const v = n.v ?? 0.1;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(v, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + n.d + 0.02);
  }

  play(name: SfxName) {
    if (!this.sfxEnabled || this.sfxVolume <= 0) return;
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus) return;
    const now = ctx.currentTime;
    for (const n of SFX[name]) this.tone(n, now, this.sfxBus);
  }

  setSfx(on: boolean) {
    this.sfxEnabled = on;
  }

  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVolume;
  }

  setBgmVolume(v: number) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmBus) this.bgmBus.gain.value = this.bgmVolume;
  }

  setMusic(on: boolean) {
    this.musicEnabled = on;
    if (!on) {
      this.stopAll(CROSSFADE);
      this.currentScene = null;
    } else if (this.currentScene) {
      const scene = this.currentScene;
      this.currentScene = null;
      this.setScene(scene);
    }
  }

  private async loadTrack(id: TrackId): Promise<AudioBuffer | null> {
    const cached = this.decoded.get(id);
    if (cached) return cached;
    const pending = this.decoding.get(id);
    if (pending) return pending;

    const ctx = this.ensure();
    if (!ctx) return null;

    const promise = (async () => {
      try {
        const res = await fetch(TRACKS[id].url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.decoded.set(id, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.decoding.delete(id);
      }
    })();

    this.decoding.set(id, promise);
    return promise;
  }

  setScene(scene: SceneKey) {
    this.currentScene = scene;
    if (!this.musicEnabled) return;
    const ctx = this.ensure();
    if (!ctx) return;

    const trackId = SCENE_TRACK[scene];
    if (this.current && this.current.id === trackId && !this.current.fading) return;

    if (this.jingleTimeout !== null) {
      window.clearTimeout(this.jingleTimeout);
      this.jingleTimeout = null;
    }

    void this.startTrack(trackId);
  }

  private async startTrack(trackId: TrackId) {
    const ctx = this.ensure();
    if (!ctx || !this.bgmBus) return;

    const buf = await this.loadTrack(trackId);
    if (!buf) return;
    if (!this.musicEnabled) return;

    if (this.currentScene && SCENE_TRACK[this.currentScene] !== trackId) return;

    if (this.current && this.current.id === trackId && !this.current.fading) return;

    const meta = TRACKS[trackId];
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(1, now + CROSSFADE);
    gain.connect(this.bgmBus);

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = meta.loop;
    source.connect(gain);
    source.start(now);

    const previous = this.current;
    const added: PlayingTrack = { id: trackId, source, gain, startedAt: now, fading: false };
    this.current = added;

    if (previous) {
      this.fadeOut(previous, CROSSFADE);
    }

    if (!meta.loop) {
      const durationMs = Math.max(0.5, buf.duration) * 1000;
      this.jingleTimeout = window.setTimeout(() => {
        if (this.current === added) {
          this.current = null;
        }
      }, durationMs + CROSSFADE * 1000);
    }

    source.onended = () => {
      if (this.current === added && !meta.loop) {
        this.current = null;
      }
    };
  }

  private fadeOut(track: PlayingTrack, seconds: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    track.fading = true;
    const now = ctx.currentTime;
    try {
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(Math.max(0.0001, track.gain.gain.value), now);
      track.gain.gain.linearRampToValueAtTime(0.0001, now + seconds);
    } catch {
      /* ignore */
    }
    window.setTimeout(
      () => {
        try {
          track.source.stop();
        } catch {
          /* already stopped */
        }
        try {
          track.source.disconnect();
          track.gain.disconnect();
        } catch {
          /* ignore */
        }
      },
      seconds * 1000 + 80,
    );
  }

  stopAll(fadeSeconds = CROSSFADE) {
    if (this.jingleTimeout !== null) {
      window.clearTimeout(this.jingleTimeout);
      this.jingleTimeout = null;
    }
    const cur = this.current;
    this.current = null;
    if (!cur) return;
    this.fadeOut(cur, fadeSeconds);
  }

  resetSession() {
    this.stopAll(0.25);
    this.currentScene = null;
    this.decoded.clear();
    this.decoding.clear();
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend().catch(() => undefined);
    }
  }

  get activeTrack(): TrackId | null {
    return this.current?.id ?? null;
  }
}

export const audio = new AudioManager();

if (typeof window !== 'undefined') {
  const unlock = () => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}
