// Thin typed wrappers over the AppSync queries. AWSJSON arguments travel as strings.
import { client } from './amplify';
import type { Candidate, Constraints, MatchResult, Profile, StoryScene, TranscriptEntry } from '../types/travel';

const unwrap = <T,>(res: { data?: unknown; errors?: { message: string }[] | null }): T => {
  if (res.errors?.length) throw new Error(res.errors[0].message);
  const v = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  if (!v) throw new Error('Empty response');
  return v as T;
};

export const fetchScene = async (constraints: Constraints, profile: Profile, transcript: TranscriptEntry[], seen: string[]) =>
  unwrap<StoryScene>(
    await client.queries.interview({
      constraints: JSON.stringify(constraints),
      profile: JSON.stringify(profile),
      transcript: JSON.stringify(transcript),
      seen,
    }),
  );

export const fetchPrediction = async (args: {
  constraints: Constraints;
  profile: Profile;
  transcript: TranscriptEntry[];
  exclude?: string[];
  ranking?: Candidate[];
  chosen?: string;
}) =>
  unwrap<MatchResult>(
    await client.queries.predict({
      constraints: JSON.stringify(args.constraints),
      profile: JSON.stringify(args.profile),
      transcript: JSON.stringify(args.transcript),
      exclude: args.exclude ?? [],
      ranking: args.ranking ? JSON.stringify(args.ranking) : undefined,
      chosen: args.chosen,
    }),
  );

/** Step 1 of a prediction: just the ranked shortlist. */
export const fetchRanking = async (args: { constraints: Constraints; profile: Profile; transcript: TranscriptEntry[]; exclude?: string[] }) =>
  unwrap<{ ranking: Candidate[] }>(
    await client.queries.predict({
      constraints: JSON.stringify(args.constraints),
      profile: JSON.stringify(args.profile),
      transcript: JSON.stringify(args.transcript),
      exclude: args.exclude ?? [],
      stage: 'rank',
    }),
  ).ranking;
