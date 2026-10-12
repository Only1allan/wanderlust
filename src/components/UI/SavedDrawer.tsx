import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deleteJourney, listJourneys, type JournalEntry } from '../../lib/journal';
import type { MatchResult } from '../../types/travel';

interface Props {
  open: boolean;
  refreshKey: number;
  onClose: () => void;
  onOpen: (m: MatchResult) => void;
}

export function SavedDrawer({ open, refreshKey, onClose, onOpen }: Props) {
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    listJourneys()
      .then(setItems)
      .catch((e) => {
        console.error(e);
        setFailed(true);
        setItems([]);
      });
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, refreshKey, onClose]);

  const remove = async (id: string) => {
    setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);
    await deleteJourney(id).catch(console.error);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-ink-2/95 backdrop-blur-xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 id="journal-title" className="flex items-center gap-2 font-serif text-[26px] italic text-white">
                <BookOpen size={20} aria-hidden className="text-emerald-300" /> Travel journal
              </h2>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close journal" className="grid h-11 w-11 place-items-center rounded-full text-haze hover:bg-white/5 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {items === null ? (
                <div className="grid h-40 place-items-center text-haze">
                  <Loader2 className="animate-spin" aria-label="Loading journal" />
                </div>
              ) : items.length === 0 ? (
                <div className="mt-10 text-center">
                  <p className="font-serif text-[24px] italic text-white">{failed ? 'The journal is stuck in customs.' : 'No stamps yet.'}</p>
                  <p className="mx-auto mt-2 max-w-[30ch] text-[14px] text-haze">
                    {failed ? 'We couldn’t reach your saved journeys. Try again in a moment.' : 'Save a destination and it will be waiting here, postcard and all.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map(({ id, createdAt, match }, i) => (
                    <motion.li
                      key={id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-white/20"
                    >
                      <button type="button" onClick={() => onOpen(match)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left">
                        <span
                          aria-hidden
                          className="h-14 w-14 shrink-0 rounded-xl"
                          style={{ background: `linear-gradient(160deg, ${match.palette[0]}, ${match.palette[1]} 60%, ${match.palette[2]})` }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[20px] italic leading-tight text-white">{match.destinationName}</span>
                          <span className="block truncate text-[13px] text-haze">
                            {match.country} · {match.archetype}
                          </span>
                          <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-haze/70">
                            {new Date(createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(id)}
                        aria-label={`Delete ${match.destinationName} from journal`}
                        className="grid w-11 place-items-center rounded-xl text-haze opacity-70 hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100"
                      >
                        <Trash2 size={17} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
