import { useCallback, useEffect, useRef, useState } from 'react';
import { staticScene } from '../../shared/scenes';
import { applyReadings, emptyProfile, isConfident, MAX_SCENES, readingsFromSignals } from '../../shared/traits';
import { fetchScene } from '../lib/api';
import type { Constraints, Profile, StoryScene, TranscriptEntry } from '../types/travel';

export type InterviewStatus = 'starting' | 'ready' | 'thinking';

/** Prefetching the next scene for every option triples LLM calls; off while on a free-tier model quota. */
const PREFETCH = false;

const entryFor = (s: StoryScene, answer: { choice?: number; freeText?: string }): TranscriptEntry => ({
  setting: s.setting,
  prompt: s.prompt,
  options: s.options.map((o) => o.label),
  ...answer,
});

/** Runs the adaptive interview: one scene at a time, next scenes prefetched for every option. */
export function useInterview(constraints: Constraints) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [scene, setScene] = useState<StoryScene | null>(null);
  const [reaction, setReaction] = useState<string>('');
  const [status, setStatus] = useState<InterviewStatus>('starting');
  const seen = useRef<string[]>([]);
  const prefetched = useRef(new Map<number, Promise<StoryScene>>());
  const generation = useRef(0);

  const load = useCallback(
    (p: Profile, t: TranscriptEntry[]) =>
      fetchScene(constraints, p, t, seen.current).catch((err) => {
        console.warn('[WanderLust] scene fetch failed, using offline scene', err);
        return staticScene(p, seen.current);
      }),
    [constraints],
  );

  const show = useCallback((s: StoryScene, gen: number) => {
    if (gen !== generation.current) return;
    seen.current = [...seen.current, s.id];
    setScene(s);
    setStatus('ready');
  }, []);

  // Opening scene. If they pasted plans, the agent reads them first.
  useEffect(() => {
    const gen = ++generation.current;
    void load(emptyProfile(), []).then((s) => {
      if (gen !== generation.current) return;
      if (s.lastReadings?.length) setProfile((p) => applyReadings(p, s.lastReadings!));
      if (s.lastReaction) setReaction(s.lastReaction);
      show(s, gen);
    });
  }, [load, show]);

  // While they read, write the next scene for each possible tap.
  useEffect(() => {
    if (!PREFETCH || !scene || status !== 'ready') return;
    const map = new Map<number, Promise<StoryScene>>();
    scene.options.forEach((o, i) => {
      const p = applyReadings(profile, readingsFromSignals(o.signals, o.label));
      map.set(i, load(p, [...transcript, entryFor(scene, { choice: i })]));
    });
    prefetched.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const choose = useCallback(
    async (i: number) => {
      if (!scene || status !== 'ready') return;
      const opt = scene.options[i];
      const p = applyReadings(profile, readingsFromSignals(opt.signals, opt.label));
      const t = [...transcript, entryFor(scene, { choice: i })];
      setProfile(p);
      setTranscript(t);
      setReaction(opt.reaction);
      if (t.length >= MAX_SCENES) return;
      setStatus('thinking');
      const gen = ++generation.current;
      const next = await (prefetched.current.get(i) ?? load(p, t));
      show(next, gen);
    },
    [scene, status, profile, transcript, load, show],
  );

  const write = useCallback(
    async (text: string) => {
      const freeText = text.trim().slice(0, 240);
      if (!scene || status !== 'ready' || !freeText) return;
      const t = [...transcript, entryFor(scene, { freeText })];
      setTranscript(t);
      setReaction('');
      setStatus('thinking');
      const gen = ++generation.current;
      const next = await load(profile, t);
      if (gen !== generation.current) return;
      if (next.lastReadings?.length) setProfile((p) => applyReadings(p, next.lastReadings!));
      setReaction(next.lastReaction ?? 'Noted.');
      if (t.length >= MAX_SCENES) {
        setStatus('ready');
        return;
      }
      show(next, gen);
    },
    [scene, status, profile, transcript, load, show],
  );

  return {
    profile,
    transcript,
    scene,
    reaction,
    status,
    answered: transcript.length,
    confident: isConfident(profile, transcript.length),
    exhausted: transcript.length >= MAX_SCENES,
    choose,
    write,
  };
}
