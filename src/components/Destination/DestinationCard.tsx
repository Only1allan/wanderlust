import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookmarkCheck, BookmarkPlus, ChevronDown, Cpu, Dices, Loader2, RotateCcw, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { saveJourney } from '../../lib/journal';
import type { MatchResult } from '../../types/travel';
import { Button } from '../UI/Button';
import { AudioAmbience } from './AudioAmbience';
import { PredictionPanel } from './PredictionPanel';
import { PostcardImage } from './PostcardImage';

interface Props {
  match: MatchResult;
  onReroll: () => void;
  onSwitch: (name: string) => void;
  onRetake: () => void;
  onSaved: () => void;
  alreadySaved?: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;

function KineticTitle({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 aria-label={text} className="font-serif text-[clamp(48px,9vw,112px)] leading-[0.9] tracking-[-0.02em] text-white">
      {text.split(' ').map((word, wi, words) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {[...word].map((ch, ci) => (
            <motion.span
              key={ci}
              className="inline-block"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.5em', rotateX: -80, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.3 + (wi * 6 + ci) * 0.035, duration: 0.8, ease }}
            >
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && ' '}
        </span>
      ))}
    </h1>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[68px] w-[68px] place-items-center" aria-label={`${label} ${score}`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / .1)" strokeWidth="4" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#score-g)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ delay: 0.9, duration: 1.4, ease }}
        />
        <defs>
          <linearGradient id="score-g">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="1" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[17px] font-semibold tabular-nums text-white">
        {score}
        <span className="text-[10px] text-haze">%</span>
      </span>
    </div>
  );
}

export function DestinationCard({ match, onReroll, onSwitch, onRetake, onSaved, alreadySaved = false }: Props) {
  const [open, setOpen] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(alreadySaved ? 'saved' : 'idle');
  const [shared, setShared] = useState(false);
  const sentences = match.whyYouBelong.match(/[^.!?]+[.!?]+["”’]?/g) ?? [match.whyYouBelong];

  useEffect(() => {
    setOpen(0);
    setSaveState(alreadySaved ? 'saved' : 'idle');
  }, [match, alreadySaved]);

  const save = async () => {
    if (saveState === 'saving' || saveState === 'saved') return;
    setSaveState('saving');
    try {
      await saveJourney(match);
      setSaveState('saved');
      onSaved();
    } catch (err) {
      console.error('[WanderLust] save failed', err);
      setSaveState('error');
    }
  };

  const share = async () => {
    const text = `My WanderLust Index says I'm "${match.archetype}" and I belong in ${match.destinationName}, ${match.country}. Where does your chaos belong?`;
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: 'WanderLust Index', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  return (
    <article className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 lg:pt-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="glass rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-emerald-200">{match.archetype}</span>
            {match.archetypeTagline && <span className="hidden text-[12.5px] italic text-haze md:inline">{match.archetypeTagline}</span>}
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze md:hidden">your micro-destination</span>
          </motion.div>
          <div className="mt-4 [perspective:800px]">
            <KineticTitle key={match.destinationName} text={match.destinationName} />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-3 text-[17px] text-mist"
          >
            {match.region} · <span className="text-white">{match.country}</span>
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: 'spring' }} className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <ScoreRing score={Math.max(0, match.pick.score ?? match.pick.fit ?? 0)} label="Fit score" />
            <p className="text-[12px] leading-snug text-haze">
              <span className="block text-white">Fit</span>trait match − penalties
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <ScoreRing score={match.certainty} label="Certainty" />
            <p className="text-[12px] leading-snug text-haze">
              <span className="block text-white">Certainty</span>how well I know you
            </p>
          </div>
        </motion.div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.5, duration: 1, ease }}
          className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start"
        >
          <PostcardImage match={match} />
          <p className="-mt-1 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze/80">tap the postcard to flip it</p>
          <AudioAmbience type={match.ambienceType} />
        </motion.div>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="why">
            <h2 id="why" className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300/90">
              Why you belong here
            </h2>
            <div className="mt-4 space-y-4">
              {sentences.map((s, i) => (
                <motion.p
                  key={`${match.destinationName}-${i}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.25, duration: 0.7, ease }}
                  className="flex gap-4 text-[17px] leading-relaxed text-white/90 sm:text-[18.5px]"
                >
                  <span className="mt-1 font-serif text-[22px] leading-none italic text-indigo-200">{i + 1}</span>
                  <span>{s.trim()}</span>
                </motion.p>
              ))}
            </div>
          </section>

          <section aria-labelledby="plan">
            <h2 id="plan" className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300/90">
              Your first 48 hours
            </h2>
            <ol className="relative mt-4 space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-white/10">
              {match.itinerary.map((b, i) => {
                const isOpen = open === i;
                return (
                  <motion.li
                    key={`${match.destinationName}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 + i * 0.12, duration: 0.6, ease }}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      aria-controls={`blk-${i}`}
                      className={`flex w-full items-start gap-4 rounded-2xl p-2 pr-3 text-left transition-colors ${isOpen ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <span
                        className={`relative z-10 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-colors ${
                          isOpen ? 'border-emerald-300/60 bg-emerald-300/15 text-emerald-200' : 'border-white/15 bg-ink text-haze'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-haze">{b.timeBlock}</span>
                        <span className="mt-0.5 block text-[16.5px] font-medium leading-snug text-white">{b.title}</span>
                      </span>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="mt-3 text-haze">
                        <ChevronDown size={18} aria-hidden />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`blk-${i}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease }}
                          className="overflow-hidden"
                        >
                          <p className="pb-3 pl-[62px] pr-4 text-[15px] leading-relaxed text-mist">{b.description}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ol>
          </section>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={save} aria-live="polite" className="col-span-2 sm:col-span-1">
                {saveState === 'saving' ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : saveState === 'saved' ? (
                  <BookmarkCheck size={18} aria-hidden />
                ) : (
                  <BookmarkPlus size={18} aria-hidden />
                )}
                {saveState === 'saved' ? 'Saved to journal' : saveState === 'error' ? 'Retry save' : 'Save this journey'}
              </Button>
              <Button variant="ghost" onClick={onReroll} className="col-span-2 sm:col-span-1">
                <Dices size={18} aria-hidden /> Somewhere else
              </Button>
              <Button variant="quiet" onClick={onRetake}>
                <RotateCcw size={17} aria-hidden /> Retake
              </Button>
              <Button variant="quiet" onClick={share}>
                <Share2 size={17} aria-hidden /> {shared ? 'Copied!' : 'Share'}
              </Button>
            </div>
            {saveState === 'error' && (
              <p role="alert" className="text-center text-[13px] text-amber-200">
                The journal’s ink froze for a second. Tap again and we’ll write harder.
              </p>
            )}
            <p className="mt-2 flex items-center justify-center gap-2 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-haze/80">
              <Cpu size={12} aria-hidden />
              {match.source === 'ai'
                ? `Interview + write-up by ${match.model ?? 'the AI agent'} · ranked on AWS Lambda`
                : 'Ranked by the WanderLust atlas engine · AWS Lambda'}
            </p>
          </motion.div>
        </div>
      </div>

      <PredictionPanel match={match} onSwitch={onSwitch} />
    </article>
  );
}
