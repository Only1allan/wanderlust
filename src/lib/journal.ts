// Saved journeys live in DynamoDB (via AppSync). Guests are anonymous, so each browser
// remembers which records it created and only ever lists those.
import { client } from './amplify';
import type { MatchResult } from '../types/travel';

const KEY = 'wl.journal.ids';

const readIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};
const writeIds = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: saves still exist server-side */
  }
};

export interface JournalEntry {
  id: string;
  createdAt: string;
  match: MatchResult;
}

export async function saveJourney(m: MatchResult): Promise<string> {
  // Image bytes are regenerated from the palette; pasted plans and location stay private.
  const { imageDataUrl: _omit, ...rest } = m;
  void _omit;
  const { home, month, length, budget } = m.constraints;
  const result = { ...rest, constraints: { home, month, length, budget } };
  const { data, errors } = await client.models.TravelProfile.create({
    archetype: m.archetype,
    destinationName: m.destinationName,
    country: m.country,
    whyYouBelong: m.whyYouBelong,
    itineraryJson: JSON.stringify(m.itinerary),
    resultJson: JSON.stringify(result),
    ambienceType: m.ambienceType,
    fit: m.pick.score ?? m.pick.fit ?? 0,
    certainty: m.certainty,
    source: m.source,
  });
  if (errors?.length || !data) throw new Error(errors?.[0]?.message ?? 'Save failed');
  writeIds([data.id, ...readIds().filter((id) => id !== data.id)].slice(0, 30));
  return data.id;
}

export async function listJourneys(): Promise<JournalEntry[]> {
  const rows = await Promise.all(readIds().map((id) => client.models.TravelProfile.get({ id }).then((r) => r.data).catch(() => null)));
  return rows.flatMap((r) => {
    if (!r?.resultJson) return [];
    try {
      const match = (typeof r.resultJson === 'string' ? JSON.parse(r.resultJson) : r.resultJson) as MatchResult;
      return match?.pick ? [{ id: r.id, createdAt: r.createdAt, match }] : [];
    } catch {
      return [];
    }
  });
}

export async function deleteJourney(id: string) {
  writeIds(readIds().filter((x) => x !== id));
  await client.models.TravelProfile.delete({ id });
}
