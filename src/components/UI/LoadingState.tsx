import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PLACE_PHOTOS } from '../../lib/placePhotos';
import { SCENE_PHOTOS } from '../../lib/scenePhotos';

const SLIDES = [...PLACE_PHOTOS.map((p) => ({ src: p.src, label: `${p.place}, ${p.country}` })), ...SCENE_PHOTOS.map((p) => ({ src: p.src, label: p.caption }))];

const STATUSES = [
  'Shortlisting places that match your ten traits…',
  'Checking the weather in your travel month…',
  'Ranking by fit, distance and budget…',
  'Calculating tolerance for tourist traps…',
  'Scanning hidden mountain passes…',
  'Verifying coffee quality…',
  'Interviewing a suspicious number of fishermen…',
  'Measuring distance to nearest souvenir magnet…',
  'Cross-referencing your hammock preferences…',
  'Asking a local grandmother for a second opinion…',
  'Removing every place with a selfie queue…',
  'Tuning the ambience to your nervous system…',
];

export function LoadingState() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [slide, setSlide] = useState(() => Math.floor(Math.random() * SLIDES.length));

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STATUSES.length), 1300);
    const s = setInterval(() => setSlide((n) => (n + 1) % SLIDES.length), 2600);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, []);

  const routes = [
    'M40 150 C 90 60, 180 60, 240 120',
    'M60 200 C 120 240, 200 220, 250 170',
    'M90 80 C 150 140, 160 200, 220 230',
  ];

  return (
    <div role="status" aria-live="polite" className="relative flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center px-4 text-center">
      {/* The agent "flips through" places while it ranks: slow crossfade with a gentle zoom. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden">
        <AnimatePresence>
          <motion.img
            key={SLIDES[slide].src}
            src={SLIDES[slide].src}
            alt=""
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.32, scale: 1.0 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 4, ease: 'easeOut' } }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(7_6_13/0.55)_0%,var(--color-ink)_75%)]" />
      </div>
      <div className="relative h-[280px] w-[280px]">
        <motion.div
          className="absolute inset-0 rounded-full border border-white/10"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 48 }, (_, k) => (
            <span
              key={k}
              className={`absolute left-1/2 top-0 w-px origin-[0_140px] ${k % 12 === 0 ? 'h-3 bg-white/50' : 'h-1.5 bg-white/20'}`}
              style={{ transform: `rotate(${k * 7.5}deg)` }}
            />
          ))}
        </motion.div>
        <svg viewBox="0 0 280 280" className="absolute inset-0" aria-hidden>
          <defs>
            <radialGradient id="globe" cx="40%" cy="35%">
              <stop offset="0" stopColor="#312e81" stopOpacity="0.9" />
              <stop offset="1" stopColor="#0b0a14" stopOpacity="0.4" />
            </radialGradient>
            <linearGradient id="route" x1="0" x2="1">
              <stop offset="0" stopColor="#a5b4fc" />
              <stop offset="1" stopColor="#6ee7b7" />
            </linearGradient>
          </defs>
          <circle cx="140" cy="140" r="104" fill="url(#globe)" stroke="rgb(255 255 255 / .12)" />
          {[-60, -30, 0, 30, 60].map((lat) => (
            <ellipse key={lat} cx="140" cy={140 + lat * 1.4} rx={104 * Math.cos((lat * Math.PI) / 180)} ry="10" fill="none" stroke="rgb(255 255 255 / .06)" />
          ))}
          {[0, 1, 2].map((k) => (
            <motion.ellipse
              key={k}
              cx="140"
              cy="140"
              ry="104"
              fill="none"
              stroke="rgb(255 255 255 / .07)"
              animate={reduce ? { rx: 60 } : { rx: [104, 0, 104] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: k * 2 }}
            />
          ))}
          {routes.map((d, k) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="url(#route)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="1 0"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: k * 0.8, ease: 'easeInOut' }}
            />
          ))}
          <motion.circle
            cx="240"
            cy="120"
            r="4"
            fill="#6ee7b7"
            animate={{ scale: [1, 2.4, 1], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </svg>
      </div>

      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-300/90">Analyzing WanderLust Index</p>
      <div className="mt-4 h-[64px] w-full max-w-[34ch]">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
            transition={{ duration: 0.4 }}
            className="font-serif text-[26px] leading-tight italic text-white"
          >
            {STATUSES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-2 font-mono text-[12px] text-haze">Looking at {SLIDES[slide].label}</p>
      <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,#a5b4fc,#6ee7b7)]"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
