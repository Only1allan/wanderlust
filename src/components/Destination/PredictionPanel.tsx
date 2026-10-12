import { motion } from 'framer-motion';
import { ArrowUpRight, Check, TriangleAlert } from 'lucide-react';
import { fitBreakdown, TRAITS } from '../../../shared/traits';
import { TRAIT_IDS } from '../../../shared/types';
import type { MatchResult } from '../../types/travel';
import { RadarChart } from '../UI/RadarChart';

interface Props {
  match: MatchResult;
  onSwitch: (name: string) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay: i * 0.06, duration: 0.6, ease },
});

/** Explains the prediction: you vs the place, the evidence behind it, and what it beat. */
export function PredictionPanel({ match, onSwitch }: Props) {
  const { rows } = fitBreakdown(match.profile, match.pick.traits);
  const matches = [...rows].filter((r) => r.closeness >= 0.75).sort((a, b) => b.weight * b.closeness - a.weight * a.closeness).slice(0, 3);
  const stretch = [...rows].filter((r) => r.closeness < 0.75 && r.certainty > 0.2).sort((a, b) => b.weight * (1 - b.closeness) - a.weight * (1 - a.closeness))[0];
  const best = match.ranking[0]?.score ?? 100;

  return (
    <section aria-labelledby="engine" className="mt-20">
      <motion.div {...reveal()} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300/90">Show your working</p>
          <h2 id="engine" className="mt-2 font-serif text-[clamp(32px,5vw,52px)] leading-[1] tracking-tight text-white">
            Why the engine <em>picked {match.destinationName}</em>
          </h2>
        </div>
        <p className="max-w-[40ch] text-[13.5px] leading-relaxed text-haze">
          Fit weighs each trait by how sure I am about you, then subtracts points for season, distance and budget.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <motion.div {...reveal(1)} className="glass flex flex-col items-center justify-center rounded-[28px] p-6">
          <RadarChart
            axes={TRAIT_IDS.map((t) => TRAITS[t].label.split(' ')[0])}
            series={[
              { label: 'You', values: TRAIT_IDS.map((t) => match.profile[t].mean), stroke: '#c7d2fe', fill: 'rgb(129 140 248 / 0.25)' },
              { label: match.destinationName, values: TRAIT_IDS.map((t) => match.pick.traits[t]), stroke: '#6ee7b7', fill: 'rgb(52 211 153 / 0.12)', dashed: true },
            ]}
            size={340}
            ariaLabel={`Your profile compared with ${match.destinationName}`}
          />
          <div className="mt-4 flex items-center gap-5 text-[13px] text-mist">
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-indigo-200" aria-hidden /> You
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-emerald-300" aria-hidden /> {match.destinationName}
            </span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div {...reveal(2)} className="glass rounded-[28px] p-6">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze">Strongest matches</h3>
            <ul className="mt-4 space-y-4">
              {matches.map((r) => (
                <li key={r.trait} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-300/15 text-emerald-300">
                    <Check size={14} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] text-white">
                      {TRAITS[r.trait].label}
                      <span className="font-mono text-[11px] text-haze">
                        you {r.you} · place {r.place}
                      </span>
                    </p>
                    {match.profile[r.trait].evidence[0] && (
                      <p className="mt-0.5 text-[13.5px] text-mist">
                        because you chose <span className="font-serif italic text-white">“{match.profile[r.trait].evidence[0]}”</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {stretch && (
              <div className="mt-5 flex gap-3 border-t border-white/10 pt-4">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300/15 text-amber-200">
                  <TriangleAlert size={13} aria-hidden />
                </span>
                <p className="text-[14px] leading-snug text-mist">
                  <span className="text-white">Where it’ll stretch you: {TRAITS[stretch.trait].label.toLowerCase()}.</span> You’re at {stretch.you}, it runs{' '}
                  {stretch.place > stretch.you ? 'hotter' : 'calmer'} at {stretch.place}. Honest prediction, not flattery.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div {...reveal(3)} className="glass rounded-[28px] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze">The shortlist</h3>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-haze/70">score = fit − penalties</span>
            </div>
            <ol className="mt-4 space-y-2">
              {match.ranking.slice(0, 5).map((c, i) => {
                const current = c.name === match.destinationName;
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      disabled={current}
                      onClick={() => onSwitch(c.name)}
                      aria-label={current ? `${c.name}, current pick, score ${c.score}` : `Show ${c.name} instead, score ${c.score}`}
                      className={`group grid w-full grid-cols-[22px_1fr_auto] items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
                        current ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="font-mono text-[12px] text-haze">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[15px] text-white">
                          <span className="truncate">{c.name}</span>
                          <span className="shrink-0 text-[12px] text-haze">{c.country}</span>
                          {current && <span className="shrink-0 rounded-full bg-emerald-300/15 px-2 py-0.5 text-[10.5px] text-emerald-200">your pick</span>}
                        </span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                          <motion.span
                            className="block h-full rounded-full bg-[linear-gradient(90deg,#a5b4fc,#6ee7b7)]"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.max(6, ((c.score ?? 0) / Math.max(1, best)) * 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease }}
                          />
                        </span>
                        {(c.penaltyNotes?.length ?? 0) > 0 && <span className="mt-1 block truncate text-[12px] text-amber-200/80">−{c.penalty}: {c.penaltyNotes!.join(', ')}</span>}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[14px] tabular-nums text-white">
                        {c.score}
                        {!current && <ArrowUpRight size={14} className="text-haze opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {match.versusRunnerUp && <p className="mt-4 border-t border-white/10 pt-4 text-[14px] leading-relaxed text-mist">{match.versusRunnerUp}</p>}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
