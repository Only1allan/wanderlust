import { useCallback, useRef, useState } from 'react';
import { predictWithEngine } from '../../shared/engine';
import { fetchPrediction, fetchRanking } from '../lib/api';
import type { Constraints, MatchResult, Profile, TranscriptEntry } from '../types/travel';

export type AgentStatus = 'idle' | 'loading' | 'success' | 'error';

const MIN_THEATRE_MS = 4500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Request {
  constraints: Constraints;
  profile: Profile;
  transcript: TranscriptEntry[];
}

export function useTravelAgent() {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [result, setResult] = useState<MatchResult | null>(null);
  const last = useRef<Request | null>(null);
  const shown = useRef<string[]>([]);

  const run = useCallback(async (req: Request, extra: { chosen?: string; fromRanking?: boolean } = {}) => {
    last.current = req;
    setStatus('loading');
    const started = Date.now();
    // Rank first, then write up the pick: two short requests instead of one long one.
    const call = async () => {
      const ranking = extra.fromRanking && result ? result.ranking : await fetchRanking({ ...req, exclude: shown.current });
      const chosen = extra.chosen ?? ranking.find((c) => !shown.current.includes(c.name))?.name ?? ranking[0]?.name;
      return fetchPrediction({ ...req, exclude: shown.current, ranking, chosen });
    };
    try {
      let match: MatchResult;
      try {
        match = await call();
      } catch {
        await wait(800);
        match = await call();
      }
      await wait(Math.max(0, (extra.fromRanking ? 2200 : MIN_THEATRE_MS) - (Date.now() - started)));
      shown.current = [...shown.current, match.destinationName].slice(-10);
      setResult(match);
      setStatus('success');
    } catch (err) {
      console.error('[WanderLust] prediction failed', err);
      await wait(Math.max(0, 1800 - (Date.now() - started)));
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const predict = useCallback((req: Request) => {
    shown.current = [];
    return run(req);
  }, [run]);

  /** Jump to a specific shortlisted place (or the next unseen one) without re-shortlisting. */
  const switchTo = useCallback(
    (name?: string) => {
      if (!last.current || !result) return;
      const next = name ?? result.ranking.find((c) => !shown.current.includes(c.name))?.name;
      if (!next) {
        shown.current = result.ranking.map((c) => c.name);
        return run(last.current);
      }
      return run(last.current, { chosen: next, fromRanking: true });
    },
    [result, run],
  );

  const retry = useCallback(() => {
    if (last.current) void run(last.current);
  }, [run]);

  const offline = useCallback(() => {
    if (!last.current) return;
    const { profile, constraints } = last.current;
    const match = predictWithEngine(profile, constraints, shown.current);
    shown.current = [...shown.current, match.destinationName];
    setResult(match);
    setStatus('success');
  }, []);

  const showSaved = useCallback((m: MatchResult) => {
    last.current = { constraints: m.constraints, profile: m.profile, transcript: [] };
    shown.current = [m.destinationName];
    setResult(m);
    setStatus('success');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
  }, []);

  return { status, result, predict, switchTo, retry, offline, showSaved, reset };
}
