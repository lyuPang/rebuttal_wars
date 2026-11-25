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

const BGM_NOTES = [
  262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 494, 392, 330, 294,
];

class AudioManager {
  private ctx: AudioContext | null = null;
  sfxEnabled = true;
  musicEnabled = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(n: Note, base: number) {
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
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + n.d + 0.02);
  }

  play(name: SfxName) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const n of SFX[name]) this.tone(n, now);
  }

  setSfx(on: boolean) {
    this.sfxEnabled = on;
  }

  setMusic(on: boolean) {
    this.musicEnabled = on;
    if (on) this.startBgm();
    else this.stopBgm();
  }

  private startBgm() {
    if (this.bgmTimer !== null) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx) return;
      const f = BGM_NOTES[this.bgmStep % BGM_NOTES.length];
      const now = this.ctx.currentTime;
      this.tone({ f, d: 0.28, type: 'triangle', v: 0.035 }, now);
      if (this.bgmStep % 4 === 0) this.tone({ f: f / 2, d: 0.9, type: 'sine', v: 0.04 }, now);
      this.bgmStep++;
    }, 300);
  }

  private stopBgm() {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audio = new AudioManager();
