import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { usePlacePhoto } from '../../lib/commonsPhoto';
import type { MatchResult } from '../../types/travel';

// ---- colour + randomness helpers -------------------------------------------------
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((c, i) => c + (hex(b)[i] - c) * t));

const seeded = (str: string) => {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const W = 600;
const H = 400;
const HORIZON = 250;

const ridge = (rnd: () => number, base: number, amp: number, steps: number, sharp = true) => {
  let d = `M0 ${H} L0 ${base}`;
  for (let i = 1; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = base - rnd() * amp;
    if (sharp) d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    else {
      const cx = x - W / steps / 2;
      d += ` Q${cx.toFixed(0)} ${(base - rnd() * amp * 1.3).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    }
  }
  return d + ` L${W} ${H} Z`;
};

function Layer({ depth, mx, my, children }: { depth: number; mx: MotionValue<number>; my: MotionValue<number>; children: ReactNode }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth * 0.5);
  return <motion.g style={{ x, y }}>{children}</motion.g>;
}

function SceneArt({ match, mx, my }: { match: MatchResult; mx: MotionValue<number>; my: MotionValue<number> }) {
  const { palette, scene, ambienceType, destinationName } = match;
  const [dark, mid, light] = palette;
  const night = ambienceType === 'night';
  const rainy = ambienceType === 'rain';

  const art = useMemo(() => {
    const rnd = seeded(destinationName + scene);
    const skyTop = mix(dark, '#05040a', night ? 0.6 : 0.25);
    const skyMid = mix(mid, dark, night ? 0.55 : 0.15);
    const skyLow = mix(light, mid, night ? 0.5 : 0.1);
    const far = mix(mid, skyLow, 0.45);
    const midC = mix(dark, mid, 0.45);
    const near = mix(dark, '#05040a', 0.35);
    const sun = { x: 120 + rnd() * 360, y: 70 + rnd() * 90, r: night ? 20 : 34 };
    const stars = Array.from({ length: night ? 90 : rainy ? 0 : 18 }, () => [rnd() * W, rnd() * HORIZON * 0.9, rnd() * 1.2 + 0.3]);
    const water = scene === 'coast' || scene === 'island';

    const farLayer: ReactNode[] = [];
    const midLayer: ReactNode[] = [];
    const nearLayer: ReactNode[] = [];

    if (scene === 'mountain') {
      const peaks = ridge(rnd, 190, 130, 7);
      farLayer.push(<path key="f" d={peaks} fill={far} />);
      farLayer.push(<path key="snow" d={peaks} fill="none" stroke={mix(light, '#ffffff', 0.6)} strokeOpacity={0.5} strokeWidth={2.5} />);
      midLayer.push(<path key="m" d={ridge(rnd, 270, 90, 9)} fill={midC} />);
      nearLayer.push(<path key="n" d={ridge(rnd, 345, 60, 12, false)} fill={near} />);
    } else if (scene === 'desert') {
      farLayer.push(<path key="mesa" d={`M0 ${H} L0 230 L90 230 L110 160 L230 160 L250 230 L380 230 L395 185 L470 185 L490 230 L${W} 230 L${W} ${H}Z`} fill={far} />);
      midLayer.push(<path key="d1" d={ridge(rnd, 300, 50, 4, false)} fill={mix(mid, light, 0.25)} />);
      nearLayer.push(<path key="d2" d={ridge(rnd, 350, 40, 3, false)} fill={mix(dark, mid, 0.6)} />);
    } else if (scene === 'city') {
      const blds = Array.from({ length: 16 }, (_, i) => {
        const w = 30 + rnd() * 30;
        const x = i * 38 - 10;
        const h = 70 + rnd() * 150;
        return { x, w, h };
      });
      farLayer.push(<path key="hills" d={ridge(rnd, 220, 50, 5, false)} fill={far} />);
      midLayer.push(
        ...blds.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={H - 60 - b.h} width={b.w} height={b.h + 60} fill={mix(midC, near, i % 2 ? 0.2 : 0.5)} />
            {Array.from({ length: Math.floor(b.h / 18) }, (_, r) =>
              Array.from({ length: Math.floor(b.w / 12) }, (_, c) =>
                rnd() > 0.55 ? (
                  <rect key={`${r}-${c}`} x={b.x + 5 + c * 12} y={H - 52 - b.h + r * 18} width={5} height={7} fill={light} opacity={0.35 + rnd() * 0.6} />
                ) : null,
              ),
            )}
          </g>
        )),
      );
      nearLayer.push(<rect key="street" x={0} y={H - 40} width={W} height={40} fill={near} />);
      if (night || match.profile.social.mean > 60)
        nearLayer.push(<rect key="neon" x={60 + rnd() * 300} y={H - 120} width={70} height={14} rx={4} fill={mid} opacity={0.9} filter="url(#pc-glow)" />);
    } else if (scene === 'forest') {
      farLayer.push(<path key="h1" d={ridge(rnd, 215, 70, 5, false)} fill={far} />);
      midLayer.push(<path key="h2" d={ridge(rnd, 285, 50, 6, false)} fill={midC} />);
      const pines = Array.from({ length: 26 }, (_, i) => {
        const x = i * 24 + rnd() * 12 - 10;
        const h = 60 + rnd() * 80;
        return <path key={i} d={`M${x} ${H} L${x + 14} ${H - h} L${x + 28} ${H} Z`} fill={near} />;
      });
      nearLayer.push(...pines, <rect key="ground" x={0} y={H - 20} width={W} height={20} fill={near} />);
    } else if (scene === 'village') {
      farLayer.push(<path key="h1" d={ridge(rnd, 210, 80, 6, false)} fill={far} />);
      midLayer.push(<path key="h2" d={ridge(rnd, 290, 40, 4, false)} fill={midC} />);
      const houses = Array.from({ length: 11 }, (_, i) => {
        const x = 20 + i * 52 + rnd() * 10;
        const w = 34 + rnd() * 14;
        const h = 28 + rnd() * 26;
        const y = 320 - rnd() * 30;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h + 60} fill={mix(near, midC, rnd() * 0.4)} />
            <path d={`M${x - 4} ${y} L${x + w / 2} ${y - 18} L${x + w + 4} ${y} Z`} fill={mix(near, '#000', 0.2)} />
            {rnd() > 0.3 && <rect x={x + w / 2 - 4} y={y + 10} width={8} height={10} fill={light} opacity={night ? 0.95 : 0.5} />}
          </g>
        );
      });
      nearLayer.push(...houses);
    }

    if (water) {
      if (scene === 'coast') farLayer.push(<path key="head" d={ridge(rnd, 245, 110, 6)} fill={far} />);
      midLayer.push(<rect key="sea" x={0} y={HORIZON + 10} width={W} height={H} fill={mix(mid, dark, 0.35)} />);
      midLayer.push(
        ...Array.from({ length: 22 }, (_, i) => (
          <rect
            key={`w${i}`}
            x={rnd() * W}
            y={HORIZON + 18 + rnd() * 130}
            width={20 + rnd() * 70}
            height={1.5}
            fill={light}
            opacity={0.15 + rnd() * 0.3}
          />
        )),
      );
      midLayer.push(<rect key="glint" x={sun.x - 30} y={HORIZON + 12} width={60} height={140} fill={`url(#pc-glint)`} />);
      if (scene === 'island')
        nearLayer.push(<path key="isle" d={`M200 ${HORIZON + 20} Q 280 ${HORIZON - 70} 330 ${HORIZON - 30} Q 380 ${HORIZON - 60} 430 ${HORIZON + 20} Z`} fill={near} />);
      nearLayer.push(<path key="shore" d={ridge(rnd, 372, 26, 5, false)} fill={near} />);
    }

    return { skyTop, skyMid, skyLow, sun, stars, farLayer, midLayer, nearLayer };
  }, [dark, mid, light, scene, destinationName, night, rainy, match.profile.social.mean]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.skyTop} />
          <stop offset="0.55" stopColor={art.skyMid} />
          <stop offset="1" stopColor={art.skyLow} />
        </linearGradient>
        <radialGradient id="pc-sun">
          <stop offset="0" stopColor={mix(light, '#ffffff', 0.5)} />
          <stop offset="0.35" stopColor={light} stopOpacity="0.8" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pc-glint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity="0.45" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </linearGradient>
        <filter id="pc-glow">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="pc-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#pc-sky)" />
      <Layer depth={-4} mx={mx} my={my}>
        {art.stars.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.3 + (i % 5) * 0.12} />
        ))}
        <circle cx={art.sun.x} cy={art.sun.y} r={art.sun.r * 3.2} fill="url(#pc-sun)" />
        <circle cx={art.sun.x} cy={art.sun.y} r={art.sun.r} fill={mix(light, '#ffffff', night ? 0.75 : 0.45)} />
      </Layer>
      <Layer depth={-8} mx={mx} my={my}>
        {art.farLayer}
      </Layer>
      <Layer depth={-14} mx={mx} my={my}>
        {art.midLayer}
      </Layer>
      <Layer depth={-22} mx={mx} my={my}>
        {art.nearLayer}
      </Layer>
      {rainy && (
        <g opacity={0.35}>
          {Array.from({ length: 70 }, (_, i) => (
            <line key={i} x1={(i * 53) % W} y1={(i * 97) % H} x2={((i * 53) % W) - 8} y2={((i * 97) % H) + 22} stroke="#e2e8f0" strokeWidth={1} />
          ))}
        </g>
      )}
      <rect width={W} height={H} fill="url(#pc-fade)" />
    </svg>
  );
}

export function PostcardImage({ match }: { match: MatchResult }) {
  const photo = usePlacePhoto(match.destinationName, match.country);
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 120, damping: 20 });
  const my = useSpring(myRaw, { stiffness: 120, damping: 20 });
  const rotX = useTransform(my, (v) => v * -0.6);
  const rotY = useTransform(mx, (v) => v * 0.6);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mxRaw.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    myRaw.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => {
    mxRaw.set(0);
    myRaw.set(0);
  };

  const label = `${flipped ? 'Show postcard front' : 'Flip postcard to read the image prompt'}`;

  return (
    <div className="perspective" onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div className="preserve-3d" style={{ rotateX: rotX, rotateY: rotY }}>
      <motion.button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={label}
        aria-pressed={flipped}
        className="preserve-3d relative block aspect-[3/2] w-full cursor-pointer rounded-[22px] text-left"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
      >
        {/* Front */}
        <div className="backface-hidden absolute inset-0 overflow-hidden rounded-[22px] border border-white/15 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]">
          {match.imageDataUrl ? (
            <img src={match.imageDataUrl} alt={`AI-generated postcard of ${match.destinationName}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <SceneArt match={match} mx={mx} my={my} />
              {photo && (
                <motion.img
                  key={photo.src}
                  src={photo.src}
                  alt={`Photo of ${match.destinationName}, ${match.country}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.55))]" />
          <div className="absolute right-4 top-4 flex h-[74px] w-[60px] flex-col items-center justify-center rounded-[4px] border-2 border-dashed border-white/60 bg-white/10 text-center backdrop-blur-sm">
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/80">Par avion</span>
            <span className="mt-0.5 font-serif text-[22px] leading-none italic text-white">{Math.max(0, match.pick.score ?? 0)}</span>
            <span className="font-mono text-[7px] uppercase text-white/70">fit</span>
          </div>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/75">Greetings from</p>
            <p className="font-serif text-[clamp(28px,5vw,46px)] leading-[0.95] italic text-white drop-shadow-[0_2px_20px_rgb(0_0_0/0.6)]">{match.destinationName}</p>
          </div>
          <span className="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/80 backdrop-blur sm:inline-flex">
            <RotateCcw size={11} aria-hidden /> Flip
          </span>
        </div>

        {/* Back */}
        <div
          className="backface-hidden absolute inset-0 overflow-hidden rounded-[22px] border border-black/10 bg-[#f3ece0] p-5 text-[#2a2420] sm:p-7"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="grid h-full grid-cols-[1.4fr_1fr] gap-5">
            <div className="flex min-h-0 flex-col border-r border-dashed border-[#2a2420]/25 pr-5">
              {photo && !match.imageDataUrl ? (
                <>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#2a2420]/60">Photo from Wikimedia Commons</p>
                  <p className="mt-2 font-serif text-[clamp(14px,2.2vw,19px)] leading-snug italic">{photo.author}</p>
                  <p className="mt-1 font-mono text-[11px] text-[#2a2420]/70">{photo.license}</p>
                  <a
                    href={photo.source}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 font-mono text-[11px] text-[#2a2420] underline underline-offset-4"
                  >
                    Source and licence
                  </a>
                </>
              ) : (
                <>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#2a2420]/60">
                    {match.imageSource === 'nova-canvas' ? 'Painted by Amazon Nova Canvas from' : 'Postcard art generated from'}
                  </p>
                  <p className="mt-2 min-h-0 overflow-hidden font-serif text-[clamp(14px,2.2vw,19px)] leading-snug italic">“{match.imagePrompt}”</p>
                </>
              )}
            </div>
            <div className="flex flex-col justify-between">
              <div className="ml-auto grid h-14 w-12 place-items-center rounded-[3px] border-2 border-dashed border-[#2a2420]/40 font-serif text-[18px] italic">✦</div>
              <div className="space-y-3 font-serif text-[clamp(13px,1.8vw,16px)] italic">
                <p className="border-b border-[#2a2420]/25 pb-1">{match.archetype}</p>
                <p className="border-b border-[#2a2420]/25 pb-1">{match.region}</p>
                <p className="border-b border-[#2a2420]/25 pb-1">{match.country}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.button>
      </motion.div>
    </div>
  );
}
