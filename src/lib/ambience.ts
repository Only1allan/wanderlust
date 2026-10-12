// Live-synthesised soundscapes. No audio files: everything is noise, filters and oscillators.
import type { Ambience } from '../types/travel';

type Stop = () => void;

const noiseBuffer = (ctx: AudioContext, kind: 'white' | 'pink' | 'brown') => {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
      }
    }
  }
  return buf;
};

const noise = (ctx: AudioContext, kind: 'white' | 'pink' | 'brown', out: AudioNode, gain: number, filter?: BiquadFilterOptions) => {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = gain;
  let node: AudioNode = src;
  let f: BiquadFilterNode | undefined;
  if (filter) {
    f = new BiquadFilterNode(ctx, filter);
    src.connect(f);
    node = f;
  }
  node.connect(g).connect(out);
  src.start();
  return { src, g, f };
};

const lfo = (ctx: AudioContext, target: AudioParam, rate: number, depth: number) => {
  const o = ctx.createOscillator();
  o.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
};

/** Schedules short random events (drips, birds, clinks) until stopped. */
const sprinkle = (fn: () => void, min: number, max: number): Stop => {
  let t: ReturnType<typeof setTimeout>;
  let alive = true;
  const loop = () => {
    if (!alive) return;
    fn();
    t = setTimeout(loop, min + Math.random() * (max - min));
  };
  t = setTimeout(loop, min);
  return () => {
    alive = false;
    clearTimeout(t);
  };
};

const blip = (ctx: AudioContext, out: AudioNode, freq: number, dur: number, vol: number, type: OscillatorType = 'sine', glideTo?: number) => {
  const o = ctx.createOscillator();
  o.type = type;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  o.frequency.setValueAtTime(freq, now);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, now + dur);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  const pan = new StereoPannerNode(ctx, { pan: Math.random() * 1.6 - 0.8 });
  o.connect(g).connect(pan).connect(out);
  o.start(now);
  o.stop(now + dur + 0.05);
};

const SCAPES: Record<Ambience, (ctx: AudioContext, out: AudioNode) => Stop[]> = {
  rain: (ctx, out) => {
    noise(ctx, 'pink', out, 0.55, { type: 'highpass', frequency: 900 });
    noise(ctx, 'brown', out, 0.35, { type: 'lowpass', frequency: 400 });
    return [sprinkle(() => blip(ctx, out, 1800 + Math.random() * 2400, 0.04, 0.05, 'sine', 900), 40, 180)];
  },
  ocean: (ctx, out) => {
    const { g } = noise(ctx, 'brown', out, 0.5, { type: 'lowpass', frequency: 700, Q: 0.5 });
    const { f } = noise(ctx, 'pink', out, 0.18, { type: 'bandpass', frequency: 1200, Q: 0.4 });
    const o1 = lfo(ctx, g.gain, 0.11, 0.35);
    const o2 = lfo(ctx, f!.frequency, 0.11, 700);
    return [() => (o1.stop(), o2.stop()), sprinkle(() => blip(ctx, out, 2200 + Math.random() * 600, 0.25, 0.012, 'triangle', 1700), 4000, 9000)];
  },
  forest: (ctx, out) => {
    const { f } = noise(ctx, 'pink', out, 0.3, { type: 'bandpass', frequency: 500, Q: 0.6 });
    const o = lfo(ctx, f!.frequency, 0.07, 250);
    const bird = () => {
      const base = 2400 + Math.random() * 1800;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) setTimeout(() => blip(ctx, out, base, 0.09, 0.05, 'sine', base * (1.2 + Math.random() * 0.5)), i * 110);
    };
    return [() => o.stop(), sprinkle(bird, 1400, 4200)];
  },
  cafe: (ctx, out) => {
    const { g } = noise(ctx, 'brown', out, 0.45, { type: 'bandpass', frequency: 450, Q: 0.9 });
    const o = lfo(ctx, g.gain, 0.6, 0.12);
    const chord = [196, 246.9, 293.7, 370].map((fr) => {
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: fr });
      const gg = new GainNode(ctx, { gain: 0.012 });
      osc.connect(gg).connect(out);
      osc.start();
      return osc;
    });
    return [
      () => (o.stop(), chord.forEach((c) => c.stop())),
      sprinkle(() => blip(ctx, out, 3200 + Math.random() * 1500, 0.35, 0.03, 'sine'), 1800, 5200),
    ];
  },
  night: (ctx, out) => {
    noise(ctx, 'brown', out, 0.25, { type: 'lowpass', frequency: 220 });
    const drone = new OscillatorNode(ctx, { type: 'sine', frequency: 55 });
    const dg = new GainNode(ctx, { gain: 0.05 });
    drone.connect(dg).connect(out);
    drone.start();
    const cricket = () => {
      const f = 4300 + Math.random() * 500;
      for (let i = 0; i < 3; i++) setTimeout(() => blip(ctx, out, f, 0.035, 0.035, 'sine'), i * 55);
    };
    return [() => drone.stop(), sprinkle(cricket, 250, 900)];
  },
};

export class AmbienceEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private stops: Stop[] = [];
  analyser?: AnalyserNode;

  async start(kind: Ambience) {
    this.stopNow();
    this.ctx = new AudioContext();
    await this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    const comp = new DynamicsCompressorNode(this.ctx, { threshold: -18, ratio: 4 });
    this.master.connect(comp).connect(this.analyser).connect(this.ctx.destination);
    this.stops = SCAPES[kind](this.ctx, this.master);
    this.master.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1.6);
  }

  async stop() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    await new Promise((r) => setTimeout(r, 650));
    this.stopNow();
  }

  private stopNow() {
    this.stops.forEach((s) => s());
    this.stops = [];
    void this.ctx?.close();
    this.ctx = undefined;
    this.master = undefined;
    this.analyser = undefined;
  }
}
