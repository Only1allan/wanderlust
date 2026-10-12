import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BookOpen, Compass } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { applyReadings, emptyProfile } from '../shared/traits';
import { TRAIT_IDS } from '../shared/types';
import { DestinationCard } from './components/Destination/DestinationCard';
import { InterviewFlow } from './components/Interview/InterviewFlow';
import { SetupScreen } from './components/Setup/SetupScreen';
import { Aurora } from './components/UI/Aurora';
import { ErrorState } from './components/UI/ErrorState';
import { Landing } from './components/UI/Landing';
import { LoadingState } from './components/UI/LoadingState';
import { SavedDrawer } from './components/UI/SavedDrawer';
import { useTravelAgent } from './hooks/useTravelAgent';
import { collectContext } from './lib/context';
import type { Constraints, MatchResult, Phase, Profile, TranscriptEntry } from './types/travel';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const defaultConstraints = (): Constraints => ({ home: '', month: MONTHS[(new Date().getMonth() + 1) % 12], length: 'week', budget: 'comfortable' });

/** "Surprise me": a random but coherent personality with enough evidence to rank. */
const surpriseProfile = (): Profile =>
  applyReadings(
    emptyProfile(),
    TRAIT_IDS.map((trait) => ({ trait, value: Math.round(15 + Math.random() * 70 + (Math.random() > 0.5 ? 15 : -15)), weight: 1 })),
  );

type Step = 'landing' | 'setup' | 'interview' | 'agent';

export default function App() {
  const agent = useTravelAgent();
  const [step, setStep] = useState<Step>('landing');
  const [constraints, setConstraints] = useState<Constraints>(defaultConstraints);
  const [interviewKey, setInterviewKey] = useState(0);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalKey, setJournalKey] = useState(0);
  const [fromJournal, setFromJournal] = useState(false);

  const phase: Phase =
    step !== 'agent'
      ? step
      : agent.status === 'loading'
        ? 'loading'
        : agent.status === 'error'
          ? 'error'
          : agent.status === 'success'
            ? 'reveal'
            : 'landing';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [phase]);

  const home = () => {
    agent.reset();
    setStep('landing');
  };
  const startInterview = (k: Constraints) => {
    setConstraints(k);
    setInterviewKey((n) => n + 1);
    setStep('interview');
  };
  const reveal = (profile: Profile, transcript: TranscriptEntry[]) => {
    setFromJournal(false);
    setStep('agent');
    void agent.predict({ constraints, profile, transcript });
  };
  const surprise = () => {
    setFromJournal(false);
    setStep('agent');
    void agent.predict({ constraints: { ...defaultConstraints(), context: collectContext() }, profile: surpriseProfile(), transcript: [] });
  };
  const openSaved = useCallback(
    (m: MatchResult) => {
      setJournalOpen(false);
      setFromJournal(true);
      setStep('agent');
      agent.showSaved(m);
    },
    [agent],
  );
  const closeJournal = useCallback(() => setJournalOpen(false), []);

  return (
    <MotionConfig reducedMotion="user">
      <Aurora palette={phase === 'reveal' && agent.result ? agent.result.palette : undefined} still={phase === 'landing'} />
      <div className="grain" aria-hidden />
      <a href="#main" className="sr-only z-50 rounded-full bg-white px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between px-4 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--color-ink)_20%,transparent)]" />
        <button type="button" onClick={home} className="relative flex items-center gap-2.5 rounded-full py-2 pr-3" aria-label="WanderLust Index home">
          <motion.span whileHover={{ rotate: 180 }} transition={{ type: 'spring', stiffness: 120 }} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-indigo-200">
            <Compass size={19} aria-hidden />
          </motion.span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            WanderLust <span className="font-serif text-[18px] font-normal italic text-mist">Index</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setJournalOpen(true)}
          className="glass relative flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] text-mist transition-colors hover:text-white"
        >
          <BookOpen size={16} aria-hidden /> <span>Journal</span>
        </button>
      </header>

      <main id="main" className="relative isolate">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase === 'reveal' ? `reveal-${agent.result?.destinationName}` : phase === 'interview' ? `interview-${interviewKey}` : phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.5 }}
          >
            {phase === 'landing' && <Landing onStart={() => setStep('setup')} onSurprise={surprise} />}
            {phase === 'setup' && <SetupScreen initial={constraints} onStart={startInterview} onBack={home} />}
            {phase === 'interview' && <InterviewFlow constraints={constraints} onReveal={reveal} onBack={() => setStep('setup')} />}
            {phase === 'loading' && <LoadingState />}
            {phase === 'error' && <ErrorState onRetry={agent.retry} onOffline={agent.offline} onHome={home} />}
            {phase === 'reveal' && agent.result && (
              <DestinationCard
                match={agent.result}
                alreadySaved={fromJournal}
                onReroll={() => {
                  setFromJournal(false);
                  void agent.switchTo();
                }}
                onSwitch={(name) => {
                  setFromJournal(false);
                  void agent.switchTo(name);
                }}
                onRetake={() => setStep('setup')}
                onSaved={() => setJournalKey((k) => k + 1)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative px-4 pb-8 pt-4 text-center font-mono text-[12px] tracking-[0.06em] text-haze">
        WanderLust Index · Built on AWS Amplify, AppSync, Lambda, DynamoDB and Cognito
      </footer>

      <SavedDrawer open={journalOpen} refreshKey={journalKey} onClose={closeJournal} onOpen={openSaved} />
    </MotionConfig>
  );
}
