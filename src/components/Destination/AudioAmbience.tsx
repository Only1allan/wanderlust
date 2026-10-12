import { motion } from 'framer-motion';
import { CloudRain, Coffee, Moon, Pause, Play, Trees, Waves, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AmbienceEngine } from '../../lib/ambience';
import type { Ambience } from '../../types/travel';

const META: Record<Ambience, { icon: LucideIcon; label: string; line: string }> = {
  rain: { icon: CloudRain, label: 'Soft rain', line: 'Rain on a tin roof, drips off the eaves.' },
  ocean: { icon: Waves, label: 'Sea breeze', line: 'Slow swells, a gull somewhere far off.' },
  forest: { icon: Trees, label: 'Forest air', line: 'Wind in the canopy, birds arguing politely.' },
  cafe: { icon: Coffee, label: 'Café hum', line: 'Murmur, cups, a warm chord from the corner.' },
  night: { icon: Moon, label: 'Night chorus', line: 'Crickets, a low hum of warm darkness.' },
};

const BARS = 24;

export function AudioAmbience({ type }: { type: Ambience }) {
  const engine = useRef<AmbienceEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const meta = META[type];
  const Icon = meta.icon;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const data = new Uint8Array(32);
    const tick = () => {
      const a = engine.current?.analyser;
      if (a) {
        a.getByteFrequencyData(data);
        setLevels(Array.from({ length: BARS }, (_, i) => Math.max(0.08, data[i % 32] / 255)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(
    () => () => {
      void engine.current?.stop();
    },
    [],
  );

  // A new destination means a new soundscape; restart if it was already playing.
  useEffect(() => {
    if (playing) void engine.current?.start(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const toggle = async () => {
    engine.current ??= new AmbienceEngine();
    if (playing) {
      setPlaying(false);
      setLevels(Array(BARS).fill(0.08));
      await engine.current.stop();
    } else {
      await engine.current.start(type);
      setPlaying(true);
    }
  };

  return (
    <div className="glass flex items-center gap-4 rounded-3xl p-4 sm:p-5">
      <motion.button
        type="button"
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        aria-pressed={playing}
        aria-label={playing ? `Pause ${meta.label} ambience` : `Play ${meta.label} ambience`}
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_8px_30px_rgb(139_92_246/0.5)]"
      >
        {playing && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-emerald-300"
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
        {playing ? <Pause size={22} /> : <Play size={22} className="translate-x-[1px]" />}
      </motion.button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-medium text-white">
          <Icon size={16} aria-hidden className="text-emerald-300" /> {meta.label}
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-haze">live synth</span>
        </p>
        <p className="mt-0.5 truncate text-[13px] text-haze">{meta.line}</p>
      </div>
      <div aria-hidden className="hidden h-10 items-center gap-[3px] sm:flex">
        {levels.map((l, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[linear-gradient(180deg,#a5b4fc,#6ee7b7)] transition-[height] duration-75"
            style={{ height: `${Math.round(l * 40)}px` }}
          />
        ))}
      </div>
    </div>
  );
}
