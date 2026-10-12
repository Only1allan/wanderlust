import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Compass, CornerDownLeft, Crosshair, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { archetypeFor, definingTraits, profileCertainty, TRAITS, traitCertainty } from '../../../shared/traits';
import { TRAIT_IDS } from '../../../shared/types';
import { useInterview } from '../../hooks/useInterview';
import { photoForScene } from '../../lib/scenePhotos';
import type { Constraints, Profile, TranscriptEntry } from '../../types/travel';
import { Button } from '../UI/Button';
import { RadarChart } from '../UI/RadarChart';

interface Props {
  constraints: Constraints;
  onReveal: (profile: Profile, transcript: TranscriptEntry[]) => void;
  onBack: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

function ProfilePanel({ profile, targets, compact = false }: { profile: Profile; targets: string[]; compact?: boolean }) {
  const certainty = TRAIT_IDS.map((t) => traitCertainty(profile, t));
  const radar = (
    <RadarChart
      axes={TRAIT_IDS.map((t) => TRAITS[t].label.split(' ')[0])}
      series={[{ label: 'You', values: TRAIT_IDS.map((t) => profile[t].mean), stroke: '#c7d2fe', fill: 'rgb(129 140 248 / 0.28)' }]}
      certainty={certainty}
      highlight={TRAIT_IDS.flatMap((t, i) => (targets.includes(t) ? [i] : []))}
      size={compact ? 72 : 320}
      showLabels={!compact}
      ariaLabel={`Your live profile: ${TRAIT_IDS.map((t) => `${TRAITS[t].label} ${Math.round(profile[t].mean)}`).join(', ')}`}
    />
  );
  if (compact) return radar;

  const top = definingTraits(profile).slice(0, 3).filter((d) => d.strength > 0.05);
  return (
    <div className="flex flex-col items-center gap-5">
      {radar}
      <div className="w-full text-center" aria-live="polite">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-haze">Live read</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={archetypeFor(profile)}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            className="mt-1.5 font-serif text-[27px] italic leading-tight text-white"
          >
            {archetypeFor(profile)}
          </motion.p>
        </AnimatePresence>
      </div>
      {targets.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-haze">
            <Crosshair size={12} aria-hidden /> This scene probes
          </span>
          {targets.map((t) => (
            <span key={t} className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-0.5 text-[12px] text-emerald-200">
              {TRAITS[t as keyof typeof TRAITS].label}
            </span>
          ))}
        </div>
      )}
      {top.length > 0 && (
        <ul className="w-full space-y-2 border-t border-white/10 pt-4">
          {top.map(({ t, high }) => (
            <li key={t} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-mist">
                {high ? TRAITS[t].high : TRAITS[t].low} <span className="text-haze">· {TRAITS[t].label.toLowerCase()}</span>
              </span>
              {profile[t].evidence[0] && <span className="truncate font-serif italic text-white/80">“{profile[t].evidence[0]}”</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InterviewFlow({ constraints, onReveal, onBack }: Props) {
  const iv = useInterview(constraints);
  const [draft, setDraft] = useState('');
  const certainty = Math.round(profileCertainty(iv.profile) * 100);
  const busy = iv.status !== 'ready';
  const canReveal = iv.confident || iv.exhausted;

  // One photo per scene, never repeated within a story.
  const usedPhotos = useRef<Record<string, string>>({});
  const photo = useMemo(() => {
    if (!iv.scene) return null;
    const known = usedPhotos.current[iv.scene.id];
    const pick = photoForScene(`${iv.scene.setting} ${iv.scene.prompt}`, Object.values(usedPhotos.current).filter((s) => s !== known));
    usedPhotos.current[iv.scene.id] = pick.slug;
    return pick;
  }, [iv.scene]);

  // 1 / 2 / 3 answer from the keyboard when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || busy || iv.exhausted) return;
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0) void iv.choose(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, iv]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    void iv.write(draft);
    setDraft('');
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 pt-2 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:pt-8">
      <div className="flex min-w-0 flex-col">
        {/* Progress is certainty, not a fixed question count. */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-haze">Scene {Math.min(iv.answered + 1, 9)}</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={certainty} aria-valuemin={0} aria-valuemax={100} aria-label="How well the agent knows you">
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#a5b4fc,#6ee7b7)]" animate={{ width: `${Math.max(4, certainty)}%` }} transition={{ duration: 0.8, ease }} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" aria-hidden />
          </div>
          <span className="w-[86px] text-right font-mono text-[11px] tabular-nums text-haze">{certainty}% sure</span>
        </div>

        <div className="glass mt-5 flex items-center gap-4 rounded-2xl p-3 lg:hidden">
          <ProfilePanel profile={iv.profile} targets={iv.scene?.targets ?? []} compact />
          <div className="min-w-0" aria-live="polite">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-haze">Live read</p>
            <p className="truncate font-serif text-[20px] italic text-white">{archetypeFor(iv.profile)}</p>
          </div>
        </div>

        {/* The agent talks back. */}
        <div className="mt-6 min-h-[52px]" aria-live="polite">
          <AnimatePresence mode="wait">
            {(iv.reaction || busy) && (
              <motion.div
                key={busy && !iv.reaction ? 'typing' : iv.reaction}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease }}
                className="flex items-start gap-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#818cf8,#34d399)] text-ink">
                  <Compass size={17} aria-hidden />
                </span>
                <p className="glass rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-snug text-white">
                  {iv.reaction || (
                    <span className="inline-flex gap-1" aria-label="Agent is thinking">
                      {[0, 1, 2].map((d) => (
                        <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-white/70" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }} />
                      ))}
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {canReveal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease }}
              className="overflow-hidden"
            >
              <div className="mt-5 flex flex-col items-start gap-3 rounded-3xl border border-emerald-300/30 bg-emerald-300/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-serif text-[24px] italic leading-tight text-white">I’ve got a read on you.</p>
                  <p className="mt-1 text-[13.5px] text-mist">
                    {iv.exhausted ? 'That’s plenty. Let’s find your place.' : 'Reveal now, or answer more to sharpen the prediction.'}
                  </p>
                </div>
                <Button onClick={() => onReveal(iv.profile, iv.transcript)} className="shrink-0 px-6">
                  <Sparkles size={17} aria-hidden /> Reveal my place
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mt-6 min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            {!iv.scene || busy ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4" aria-hidden>
                <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
                <div className="h-10 w-full animate-pulse rounded-2xl bg-white/[0.07]" />
                <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/[0.07]" />
                {[0, 1, 2].map((k) => (
                  <div key={k} className="h-[76px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" style={{ animationDelay: `${k * 120}ms` }} />
                ))}
                <p className="pt-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-haze">Writing your next scene…</p>
              </motion.div>
            ) : iv.exhausted ? null : (
              <motion.section
                key={iv.scene.id}
                aria-labelledby="scene-prompt"
                initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
                transition={{ duration: 0.5, ease }}
              >
                {photo && (
                  <figure className="relative mb-5 aspect-[16/6] overflow-hidden rounded-3xl bg-white/5 lg:aspect-[21/7]">
                    <motion.img
                      key={photo.src}
                      src={photo.src}
                      alt={photo.caption}
                      initial={{ opacity: 0, scale: 1.18, x: 24 }}
                      animate={{ opacity: 1, scale: 1.04, x: 0 }}
                      transition={{ opacity: { duration: 0.8 }, scale: { duration: 9, ease: 'easeOut' }, x: { duration: 9, ease: 'easeOut' } }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(7_6_13/0.7))]" />
                    <figcaption className="absolute bottom-3 left-4 font-mono text-[11px] tracking-[0.06em] text-white/80">{photo.caption}</figcaption>
                  </figure>
                )}
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300/90">{iv.scene.setting}</p>
                <h2 id="scene-prompt" className="mt-3 font-serif text-[clamp(28px,4.4vw,42px)] leading-[1.06] tracking-tight text-white">
                  {iv.scene.prompt}
                </h2>
                <div className="mt-6 grid gap-3">
                  {iv.scene.options.map((o, i) => (
                    <motion.button
                      key={o.label}
                      type="button"
                      onClick={() => void iv.choose(i)}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.07, duration: 0.45, ease }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.985 }}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-indigo-300/40 hover:bg-indigo-300/[0.06]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 font-mono text-[12px] text-haze transition-colors group-hover:border-indigo-300/60 group-hover:text-indigo-200">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[16.5px] font-medium leading-tight text-white">{o.label}</span>
                        <span className="mt-1 block text-[13.5px] leading-snug text-haze">{o.detail}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
                <form onSubmit={submit} className="mt-4">
                  <label htmlFor="free" className="sr-only">
                    Or describe what you would actually do
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-1.5 pl-4 focus-within:border-indigo-300/50">
                    <input
                      id="free"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 240))}
                      placeholder="None of these? Tell me what you’d actually do…"
                      className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-white placeholder:text-haze/70 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      aria-label="Send your answer"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ink transition-opacity disabled:opacity-25"
                    >
                      <CornerDownLeft size={17} />
                    </button>
                  </div>
                  <p className="mt-2 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-haze/70 sm:block">Tip: press 1, 2 or 3 to answer</p>
                </form>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4">
          <Button variant="quiet" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden /> Change trip details
          </Button>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="glass sticky top-24 rounded-[32px] p-7">
          <ProfilePanel profile={iv.profile} targets={iv.scene?.targets ?? []} />
        </div>
      </aside>
    </div>
  );
}
