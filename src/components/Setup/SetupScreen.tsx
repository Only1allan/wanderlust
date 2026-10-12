import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, LocateFixed, Loader2, MapPin, Timer, Wallet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { collectContext, requestCoords } from '../../lib/context';
import { SCENE_PHOTOS } from '../../lib/scenePhotos';

const BAND = ['train', 'hoian', 'perast', 'hampi'].map((s) => SCENE_PHOTOS.find((p) => p.slug === s)!);
import type { Budget, ClientContext, Constraints, TripLength } from '../../types/travel';
import { Button } from '../UI/Button';

interface Props {
  initial?: Constraints;
  onStart: (k: Constraints) => void;
  onBack: () => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const LENGTHS: { id: TripLength; label: string; hint: string }[] = [
  { id: 'weekend', label: 'Long weekend', hint: '3-4 days' },
  { id: 'week', label: 'A week', hint: '5-9 days' },
  { id: 'long', label: 'Two weeks +', hint: 'the big one' },
];
const BUDGETS: { id: Budget; label: string; hint: string }[] = [
  { id: 'shoestring', label: 'Shoestring', hint: 'hostels & street food' },
  { id: 'comfortable', label: 'Comfortable', hint: 'nice, not silly' },
  { id: 'splurge', label: 'Splurge', hint: 'treat yourself' },
];

/** Best guess at a home city from the browser's time zone, e.g. Africa/Nairobi → Nairobi. */
const guessHome = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? '';
    return /^(UTC|GMT|Etc)/i.test(tz) ? '' : city;
  } catch {
    return '';
  }
};

function Field({ icon, label, children, htmlFor }: { icon: ReactNode; label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="glass min-w-0 rounded-3xl p-4 sm:p-5">
      <label htmlFor={htmlFor} className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-emerald-300/90">
        {icon} {label}
      </label>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { id: T; label: string; hint: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`relative min-h-[64px] rounded-2xl border px-2 py-2 text-center transition-colors ${on ? 'border-emerald-300/50 text-white' : 'border-white/10 text-mist hover:border-white/25'}`}
          >
            {on && <motion.span layoutId={`seg-${name}`} className="absolute inset-0 rounded-2xl bg-emerald-300/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative block text-[13.5px] font-medium leading-tight sm:text-[14px]">{o.label}</span>
            <span className="relative mt-0.5 block text-[11px] text-haze">{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SetupScreen({ initial, onStart, onBack }: Props) {
  const nextMonth = MONTHS[(new Date().getMonth() + 1) % 12];
  const [home, setHome] = useState(initial?.home ?? guessHome());
  const [month, setMonth] = useState(initial?.month ?? nextMonth);
  const [length, setLength] = useState<TripLength>(initial?.length ?? 'week');
  const [budget, setBudget] = useState<Budget>(initial?.budget ?? 'comfortable');
  const [itinerary, setItinerary] = useState(initial?.itinerary ?? '');
  const [coords, setCoords] = useState<ClientContext['coords']>(initial?.context?.coords);
  const [locating, setLocating] = useState<'idle' | 'busy' | 'denied'>('idle');

  const locate = async () => {
    setLocating('busy');
    try {
      setCoords(await requestCoords());
      setLocating('idle');
    } catch {
      setLocating('denied');
    }
  };
  const months = useMemo(() => {
    const now = new Date().getMonth();
    return Array.from({ length: 12 }, (_, i) => MONTHS[(now + i) % 12]);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 lg:pt-8">
      {/* A slow-drifting band of real places sets the mood. */}
      <div aria-hidden className="relative -mx-4 mb-8 h-[120px] overflow-hidden sm:mx-0 sm:h-[150px] sm:rounded-3xl">
        <motion.div
          className="flex h-full w-[160%] gap-2"
          initial={{ x: 0 }}
          animate={{ x: '-30%' }}
          transition={{ duration: 45, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
        >
          {BAND.map((p) => (
            <img key={p.slug} src={p.src} alt="" className="h-full w-1/4 object-cover" />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_6_13/0.1),rgb(7_6_13/0.75))]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-haze">Step 1 of 2 · the practical bit</p>
        <h1 className="mt-3 font-serif text-[clamp(40px,7vw,68px)] leading-[0.95] tracking-tight text-white">
          Before I read you, <em>the boring facts.</em>
        </h1>
        <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-mist">
          Personality picks the vibe; these keep it real. I’ll rule out places that are too far, out of season or over budget.
        </p>
      </motion.div>

      <motion.div
        className="mt-10 grid min-w-0 grid-cols-1 gap-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
      >
        {[
          <Field key="home" icon={<MapPin size={13} aria-hidden />} label="Travelling from" htmlFor="home">
            <input
              id="home"
              value={home}
              onChange={(e) => setHome(e.target.value.slice(0, 60))}
              placeholder="City or country, e.g. Nairobi"
              autoComplete="address-level2"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[16px] text-white placeholder:text-haze/70 focus:border-indigo-300/60 focus:outline-none"
            />
            <p className="mt-2 text-[12px] text-haze">Leave blank and I’ll ignore distance.</p>
          </Field>,
          <Field key="month" icon={<CalendarDays size={13} aria-hidden />} label="When">
            <div role="radiogroup" aria-label="Travel month" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={m === month}
                  onClick={() => setMonth(m)}
                  className={`min-h-11 shrink-0 snap-start rounded-full border px-4 text-[14px] transition-colors ${
                    m === month ? 'border-emerald-300/60 bg-emerald-300/15 text-white' : 'border-white/10 text-mist hover:border-white/25'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>,
          <Field key="length" icon={<Timer size={13} aria-hidden />} label="How long">
            <Segmented name="Trip length" value={length} options={LENGTHS} onChange={setLength} />
          </Field>,
          <Field key="budget" icon={<Wallet size={13} aria-hidden />} label="Budget">
            <Segmented name="Budget" value={budget} options={BUDGETS} onChange={setBudget} />
          </Field>,
          <Field key="plans" icon={<ClipboardList size={13} aria-hidden />} label="Already have plans? (optional)" htmlFor="plans">
            <textarea
              id="plans"
              value={itinerary}
              onChange={(e) => setItinerary(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder={'Paste your itinerary or notes, e.g.\n3 nights in Lisbon, then a train to Porto. I love food markets.'}
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-white placeholder:text-haze/60 focus:border-indigo-300/60 focus:outline-none"
            />
            <p className="mt-2 flex justify-between gap-3 text-[12px] text-haze">
              <span>I will read your plans first and suggest a place that fits around them.</span>
              <span className="shrink-0 tabular-nums">{itinerary.length}/2000</span>
            </p>
          </Field>,
          <Field key="personal" icon={<LocateFixed size={13} aria-hidden />} label="Make it personal (optional)">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13.5px] leading-relaxed text-mist">
                I already use your time zone, language and local time to shape the story. Share your rough location for scenes that match your season.
              </p>
              <button
                type="button"
                onClick={locate}
                disabled={locating === 'busy' || !!coords}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[14px] transition-colors ${
                  coords ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-200' : 'border-white/15 text-white hover:border-white/30'
                }`}
              >
                {locating === 'busy' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : coords ? <Check size={15} aria-hidden /> : <LocateFixed size={15} aria-hidden />}
                {coords ? 'Location added' : locating === 'denied' ? 'Not shared. That is fine' : 'Use my location'}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-haze">Rounded to about 10 km. Never stored.</p>
          </Field>,
        ].map((el) => (
          <motion.div key={el.key} className="min-w-0" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            {el}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="quiet" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden /> Home
        </Button>
        <Button onClick={() => onStart({ home: home.trim(), month, length, budget, itinerary: itinerary.trim() || undefined, context: collectContext(coords) })} className="px-7">
          Start the interview <ArrowRight size={18} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
