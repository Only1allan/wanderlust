import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  palette?: [string, string, string];
  /** Calm mode for editorial pages: fainter, no drift, no grid. */
  still?: boolean;
}

const DEFAULT: [string, string, string] = ['#6366f1', '#7c3aed', '#34d399'];

/** Slow drifting colour fields behind everything; re-tints to the destination palette on reveal. */
export function Aurora({ palette = DEFAULT, still = false }: Props) {
  const reduce = useReducedMotion() || still;
  const blobs = [
    { c: palette[1], x: ['-10%', '8%', '-10%'], y: ['-20%', '-8%', '-20%'], s: 'w-[70vmax] h-[70vmax] -left-[20vmax] -top-[25vmax]' },
    { c: palette[0], x: ['0%', '-10%', '0%'], y: ['0%', '10%', '0%'], s: 'w-[60vmax] h-[60vmax] -right-[22vmax] top-[10vh]' },
    { c: palette[2], x: ['0%', '12%', '0%'], y: ['0%', '-6%', '0%'], s: 'w-[50vmax] h-[50vmax] left-[10vw] -bottom-[30vmax]' },
  ];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[110px] ${b.s}`}
          initial={false}
          animate={{
            backgroundColor: b.c,
            opacity: still ? 0.12 : i === 2 ? 0.26 : 0.36,
            ...(reduce ? {} : { x: b.x, y: b.y }),
          }}
          transition={{
            backgroundColor: { duration: 2.4, ease: 'easeInOut' },
            opacity: { duration: 2 },
            x: { duration: 26 + i * 6, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 30 + i * 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-ink)_88%)]" />
      <div className={`absolute inset-0 transition-opacity duration-700 ${still ? 'opacity-0' : 'opacity-[0.18]'} [background-image:linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_30%,#000_10%,transparent_65%)]`} />
    </div>
  );
}
