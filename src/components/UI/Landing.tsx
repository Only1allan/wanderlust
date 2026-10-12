import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useId, useState } from 'react';
import { SCENE_BANK } from '../../../shared/scenes';
import { applyReadings, emptyProfile, readingsFromSignals, TRAITS, traitCertainty } from '../../../shared/traits';
import type { TraitId } from '../../types/travel';
import { PLACE_PHOTOS, photoFor } from '../../lib/placePhotos';
import { SCENE_PHOTOS } from '../../lib/scenePhotos';
import { Button } from './Button';

interface Props {
  onStart: () => void;
  onSurprise: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

// The real first scene from the offline bank, with reactions written for the landing demo.
const DEMO = SCENE_BANK.find((s) => s.id === 'delay')!;
const DEMO_REACTIONS = ['You like a plan that holds. Noted.', 'You look around, but you stay near the gate. Noted.', 'You like a surprise. Noted.'];
const DEMO_TRAITS: TraitId[] = ['spontaneity', 'novelty'];

// A real run of the deployed agent (Groq, 2026-10-12): from Nairobi, one week in December.
const SPECIMEN = {
  context: 'From Nairobi, one week in December, comfortable budget',
  certainty: 60,
  rows: [
    { name: 'Lake Bunyonyi (Kigufi)', country: 'Uganda', score: 93, note: '' },
    { name: 'Lamu Old Town', country: 'Kenya', score: 92, note: '' },
    { name: 'Matsikiti Village', country: 'Zimbabwe', score: 90, note: '' },
    { name: 'Nembrala, Rote Island', country: 'Indonesia', score: 82, note: 'About 30 hours away for a one-week trip' },
    { name: "Villa O'Higgins", country: 'Chile', score: 69, note: 'About 28 hours away and over budget' },
  ],
  evidence: ['Get on the bus', 'Try many small dishes'],
  versus:
    'Lake Bunyonyi gives you the lakeside quiet and gentle hikes you want. Lamu’s old town is busier, with the crowded streets you said you avoid.',
  traits: [
    { id: 'food' as TraitId, value: 85 },
    { id: 'culture' as TraitId, value: 80 },
    { id: 'novelty' as TraitId, value: 80 },
  ],
};

function TraitBar({ id, value, certainty }: { id: TraitId; value: number; certainty?: number }) {
  const t = TRAITS[id];
  const unread = certainty !== undefined && certainty < 0.05;
  const side = unread ? 'not read yet' : value >= 50 ? t.high : t.low;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 font-mono text-[12px] tracking-[0.06em]">
        <span className="text-mist">{t.label}</span>
        <span className="tabular-nums text-white">{Math.round(value)}</span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label={`${t.label}, ${Math.round(value)} of 100, ${side}`}
        className="relative mt-2 h-1.5 rounded-full bg-white/10"
      >
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full bg-indigo-300"
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[12px] text-haze">
        {side}
        {certainty !== undefined && !unread && ` · certainty ${Math.round(certainty * 100)}%`}
      </p>
    </div>
  );
}

function DemoScene({ onContinue }: { onContinue: () => void }) {
  const id = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const profile =
    picked === null ? emptyProfile() : applyReadings(emptyProfile(), readingsFromSignals(DEMO.options[picked].signals, DEMO.options[picked].label));

  return (
    <div className="glass rounded-[28px] p-5 sm:p-7">
      <div className="flex items-center justify-between font-mono text-[12px] tracking-[0.06em]">
        <span className="text-emerald-300">{DEMO.setting}</span>
        <span className="text-haze">Scene 1</span>
      </div>
      <p id={`${id}-q`} className="mt-4 font-serif text-[24px] leading-[1.15] text-white sm:text-[28px]">
        {DEMO.prompt}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-q`} className="mt-5 grid gap-2.5">
        {DEMO.options.map((o, i) => {
          const on = picked === i;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(i)}
              className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                on ? 'border-indigo-300/60 bg-indigo-300/10' : 'border-white/10 hover:border-white/25'
              }`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border font-mono text-[12px] ${on ? 'border-indigo-300 text-indigo-200' : 'border-white/15 text-haze'}`}>
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-medium leading-tight text-white">{o.label}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-haze">{o.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[28px]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={picked ?? 'idle'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={picked === null ? 'text-[14px] text-haze' : 'text-[16px] text-white'}
          >
            {picked === null ? 'Tap an answer. This is how the real one starts.' : DEMO_REACTIONS[picked]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
        {DEMO_TRAITS.map((t) => (
          <TraitBar key={t} id={t} value={profile[t].mean} certainty={traitCertainty(profile, t)} />
        ))}
      </div>

      <AnimatePresence>
        {picked !== null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <p className="text-[14px] text-haze">The next scene depends on what you just picked.</p>
              <Button variant="solid" onClick={onContinue} className="min-h-11 px-5 text-[14px]">
                Keep going <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease },
};

export function Landing({ onStart, onSurprise }: Props) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-10">
      {/* Hero: the product, playable, over a slow-moving photo of Reine, Lofoten. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-[100dvh] overflow-hidden">
        <motion.img
          src={photoFor('reine')!.src}
          alt=""
          className="h-full w-full object-cover object-[60%_50%]"
          initial={{ scale: 1.12, x: 0 }}
          animate={{ scale: 1.22, x: -30 }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_6_13/0.92)_0%,rgb(7_6_13/0.75)_45%,rgb(7_6_13/0.35)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,var(--color-ink))]" />
      </div>
      <section className="relative grid min-h-[calc(100dvh-72px)] items-start gap-10 pb-20 pt-8 lg:grid-cols-12 lg:items-center lg:gap-x-8 lg:pt-8">
        <div className="lg:col-span-6">
          <p className="font-mono text-[12px] tracking-[0.06em] text-haze">An AI travel agent · about 2 minutes · no account</p>
          <h1 className="mt-6 max-w-[14ch] font-serif text-[clamp(44px,6.4vw,88px)] leading-[0.95] tracking-[-0.02em] text-white">
            Answer a short story. <em>Get one place to go.</em>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.55] text-mist">
            An AI travel agent puts you in a short story and watches what you choose. Then it picks one small, real place and shows its working.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button variant="solid" onClick={onStart} className="px-7">
              Start the story <ArrowRight size={18} aria-hidden />
            </Button>
            <button
              type="button"
              onClick={onSurprise}
              className="inline-flex min-h-11 items-center text-[15px] text-mist underline decoration-white/25 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60"
            >
              or pick a place for me
            </button>
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <DemoScene onContinue={onStart} />
        </div>
      </section>

      {/* Real places, real photos. */}
      <section aria-labelledby="places" className="border-t border-white/10 py-20 lg:py-24">
        <motion.div {...reveal} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="places" className="font-serif text-[clamp(28px,3.6vw,40px)] leading-[1.05] text-white">Small places, all over the map</h2>
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-mist">
            It looks for villages, islands and old quarters that suit you, not the capital everyone already knows.
          </p>
        </motion.div>
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-10 sm:px-10 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
          {PLACE_PHOTOS.filter((p) => p.slug !== 'bunyonyi').map((p, i) => (
            <motion.li
              key={p.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05, duration: 0.6, ease }}
              className={`w-[62vw] max-w-[260px] shrink-0 snap-start lg:w-auto lg:max-w-none ${i % 2 ? 'lg:mt-10' : ''}`}
            >
              <figure>
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
                  <img src={p.src} alt={`${p.place}, ${p.country}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
                </div>
                <figcaption className="mt-3">
                  <span className="block text-[15px] text-white">{p.place}</span>
                  <span className="block font-mono text-[12px] text-haze">{p.country}</span>
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* A real result, with the working shown. */}
      <section aria-labelledby="result" className="border-t border-white/10 py-24 lg:py-32">
        <motion.div {...reveal} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[12px] tracking-[0.06em] text-haze">A real result · not yours yet</p>
            <h2 id="result" className="mt-3 font-serif text-[clamp(32px,4.4vw,44px)] leading-[1.05] text-white">
              Lake Bunyonyi (Kigufi), Uganda
            </h2>
          </div>
          <p className="font-mono text-[12px] tracking-[0.06em] text-haze">{SPECIMEN.context}</p>
        </motion.div>

        <motion.figure {...reveal} className="mt-10 overflow-hidden rounded-[24px]">
          <img
            src={photoFor('bunyonyi')!.src}
            alt="Boats at a jetty on Lake Bunyonyi, Uganda"
            loading="lazy"
            className="aspect-[16/9] w-full object-cover object-[50%_25%] sm:aspect-[21/8]"
          />
        </motion.figure>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-x-8">
          <motion.div {...reveal} className="lg:col-span-7">
            <table className="w-full border-collapse text-left">
              <caption className="pb-3 text-left font-mono text-[12px] tracking-[0.06em] text-haze">The shortlist · score = fit to you minus penalties</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Place</th>
                  <th scope="col">Score</th>
                </tr>
              </thead>
              <tbody>
                {SPECIMEN.rows.map((r, i) => (
                  <tr key={r.name} className={`border-t border-white/10 ${i === 0 ? 'text-white' : 'text-mist'}`}>
                    <td className="w-8 py-4 align-top font-mono text-[12px] text-haze">{i + 1}</td>
                    <td className="py-4 pr-4 align-top">
                      <span className="text-[16px]">{r.name}</span>
                      <span className="ml-2 text-[14px] text-haze">{r.country}</span>
                      {r.note && <span className="mt-1 block font-mono text-[12px] text-amber-200/90">Lost points: {r.note.charAt(0).toLowerCase() + r.note.slice(1)}</span>}
                    </td>
                    <td className={`w-14 py-4 text-right align-top font-mono text-[16px] tabular-nums ${i === 0 ? 'text-emerald-300' : ''}`}>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-mist">{SPECIMEN.versus}</p>
          </motion.div>

          <motion.div {...reveal} className="lg:col-span-5">
            <p className="font-mono text-[12px] tracking-[0.06em] text-haze">Why it picked this</p>
            <ul className="mt-4 space-y-3">
              {SPECIMEN.evidence.map((q) => (
                <li key={q} className="font-serif text-[24px] italic leading-snug text-white">
                  You chose “{q}.”
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-5 border-t border-white/10 pt-6">
              {SPECIMEN.traits.map((t) => (
                <TraitBar key={t.id} id={t.id} value={t.value} />
              ))}
              <p className="font-mono text-[12px] text-haze">Certainty {SPECIMEN.certainty}%</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it decides: prose, not icon cards. */}
      <section aria-labelledby="how" className="border-t border-white/10 py-24 lg:py-32">
        <motion.h2 {...reveal} id="how" className="font-serif text-[clamp(32px,4.4vw,44px)] leading-[1.05] text-white">
          How it decides
        </motion.h2>
        <ol className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-x-8">
          {[
            'First it asks the basics: where you live, which month, how many days and what you can spend. If you already have plans, paste them in.',
            'Then the story starts. Each scene tests the one of 10 traits it is least sure about, and it keeps your exact words as evidence.',
            'It ranks 5 small, real places by how well they fit you. A place loses points if the season is wrong, if it is too far for the length of your trip, or if it costs more than your budget. You see every score.',
          ].map((step, i) => (
            <motion.li key={i} {...reveal} className="border-t border-white/10 pt-5">
              <span className="font-mono text-[12px] text-haze">{['Before', 'During', 'After'][i]}</span>
              <p className="mt-3 text-[17px] leading-[1.55] text-mist">{step}</p>
            </motion.li>
          ))}
        </ol>
        <motion.p {...reveal} className="mt-12 max-w-[62ch] text-[17px] leading-[1.55] text-mist">
          Each pick comes with a 48-hour plan, a postcard and a soundscape your browser makes as you listen. Tap a runner-up to switch.
        </motion.p>
      </section>

      {/* What it is not. */}
      <section aria-labelledby="not" className="grid gap-8 border-t border-white/10 py-24 lg:grid-cols-12 lg:gap-x-8 lg:py-32">
        <motion.h2 {...reveal} id="not" className="font-serif text-[clamp(32px,4.4vw,44px)] leading-[1.05] text-white lg:col-span-5">
          What it doesn’t do
        </motion.h2>
        <motion.ul {...reveal} className="space-y-4 text-[17px] leading-[1.55] text-mist lg:col-span-6 lg:col-start-7">
          <li>It doesn’t sell flights or rooms. You book the trip yourself.</li>
          <li>There are no ads.</li>
          <li>It keeps only the trips you choose to save in your journal. Nothing else about you is stored.</li>
          <li>It uses your location only if you allow it.</li>
        </motion.ul>
      </section>

      {/* Close. */}
      <section className="border-t border-white/10 py-24 lg:py-32">
        <motion.p {...reveal} className="max-w-[20ch] font-serif text-[clamp(32px,4.4vw,52px)] leading-[1.05] text-white">
          It takes about 2 minutes. The first scene is waiting.
        </motion.p>
        <motion.div {...reveal} className="mt-8">
          <Button variant="solid" onClick={onStart} className="px-7">
            Start the story <ArrowRight size={18} aria-hidden />
          </Button>
        </motion.div>
      </section>
      <details className="border-t border-white/10 py-8 text-[13px] text-haze">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-[12px] tracking-[0.06em] hover:text-white">Photo credits</summary>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {[...PLACE_PHOTOS.map((p) => ({ ...p, label: p.place })), ...SCENE_PHOTOS.map((p) => ({ ...p, label: p.caption }))].map((p) => (
            <li key={p.slug}>
              {p.label}: {p.author},{' '}
              <a href={p.source} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">
                {p.license}
              </a>
              , via Wikimedia Commons
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
