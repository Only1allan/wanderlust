import { motion } from 'framer-motion';
import { Compass, Home, RotateCw } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from './Button';

interface Props {
  onRetry: () => void;
  onOffline: () => void;
  onHome: () => void;
}

const MESSAGES = [
  ['Our homing pigeon lost signal near the mountains.', 'It’s fine. It’s a very brave pigeon. Shall we send another?'],
  ['The travel agent wandered off to look at a waterfall.', 'Honestly, relatable. Give them a second nudge.'],
  ['A goat ate the itinerary.', 'This happens more than you’d think in the Alps.'],
];

export function ErrorState({ onRetry, onOffline, onHome }: Props) {
  const [title, body] = useMemo(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)], []);
  return (
    <div role="alert" className="flex min-h-[calc(100dvh-72px)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass w-full max-w-lg rounded-[32px] p-8 text-center sm:p-10"
      >
        <motion.div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.06] text-amber-200"
          animate={{ rotate: [0, -18, 14, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
          aria-hidden
        >
          <Compass size={30} />
        </motion.div>
        <h2 className="mt-6 font-serif text-[32px] leading-tight text-white">{title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-haze">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={onRetry}>
            <RotateCw size={18} aria-hidden /> Retry connection
          </Button>
          <Button variant="ghost" onClick={onOffline}>
            <Compass size={18} aria-hidden /> Use the offline compass
          </Button>
          <Button variant="quiet" onClick={onHome}>
            <Home size={18} aria-hidden /> Back to base camp
          </Button>
        </div>
        <p className="mt-6 text-[12px] text-haze/80">The offline compass uses our curated atlas of micro-destinations, right here in your browser.</p>
      </motion.div>
    </div>
  );
}
