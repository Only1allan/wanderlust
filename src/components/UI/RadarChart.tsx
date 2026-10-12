import { motion } from 'framer-motion';
import { useId } from 'react';

export interface RadarSeries {
  label: string;
  values: number[];
  stroke: string;
  fill: string;
  dashed?: boolean;
}

interface Props {
  axes: string[];
  series: RadarSeries[];
  /** 0-1 per axis; low-certainty spokes are drawn faint. */
  certainty?: number[];
  highlight?: number[];
  size?: number;
  showLabels?: boolean;
  ariaLabel: string;
}

const spring = { type: 'spring', stiffness: 120, damping: 18 } as const;

export function RadarChart({ axes, series, certainty, highlight = [], size = 300, showLabels = true, ariaLabel }: Props) {
  const uid = useId().replace(/:/g, '');
  const n = axes.length;
  const c = size / 2;
  const r = size / 2 - (showLabels ? 46 : 6);
  const at = (i: number, v: number, rad = r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * (v / 100) * rad, c + Math.sin(a) * (v / 100) * rad] as const;
  };
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${at(i, Math.max(4, v)).map((x) => x.toFixed(1)).join(',')}`).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="overflow-visible" role="img" aria-label={ariaLabel}>
      <defs>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {[25, 50, 75, 100].map((k) => (
        <polygon
          key={k}
          points={axes.map((_, i) => at(i, k).join(',')).join(' ')}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeDasharray={k === 100 ? undefined : '2 4'}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = at(i, 100);
        const cert = certainty?.[i] ?? 1;
        return (
          <line
            key={i}
            x1={c}
            y1={c}
            x2={x}
            y2={y}
            stroke={highlight.includes(i) ? 'rgb(110 231 183 / 0.7)' : `rgb(255 255 255 / ${0.05 + cert * 0.12})`}
            strokeDasharray={highlight.includes(i) ? '3 3' : undefined}
          />
        );
      })}
      {series.map((s, si) => (
        <g key={s.label}>
          {si === 0 && <motion.path d={path(s.values)} fill={s.fill} filter={`url(#glow-${uid})`} opacity={0.6} animate={{ d: path(s.values) }} transition={spring} />}
          <motion.path
            d={path(s.values)}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={1.6}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            strokeLinejoin="round"
            animate={{ d: path(s.values) }}
            transition={spring}
          />
          {si === 0 &&
            s.values.map((v, i) => {
              const [x, y] = at(i, Math.max(4, v));
              return (
                <motion.circle
                  key={i}
                  r={highlight.includes(i) ? 4.5 : 3}
                  fill={highlight.includes(i) ? '#6ee7b7' : s.stroke}
                  opacity={0.35 + (certainty?.[i] ?? 1) * 0.65}
                  animate={{ cx: x, cy: y }}
                  transition={spring}
                />
              );
            })}
        </g>
      ))}
      {showLabels &&
        axes.map((label, i) => {
          const [x, y] = at(i, 100, r + 22);
          const cert = certainty?.[i] ?? 1;
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor={Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end'}
              dominantBaseline="middle"
              className={`font-mono text-[9px] uppercase tracking-[0.12em] ${highlight.includes(i) ? 'fill-emerald-300' : 'fill-haze'}`}
              opacity={0.45 + cert * 0.55}
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}
