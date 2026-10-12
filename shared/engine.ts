// Offline prediction engine: the curated atlas, ranked with the same certainty-weighted fit
// the AI path uses. Runs in the Lambda when the LLM is unavailable, and in the browser if
// the network itself is down.
import { DESTINATIONS, type Destination } from './destinations';
import { archetypeFor, definingTraits, profileCertainty, rankCandidates, TRAITS } from './traits';
import type { Candidate, Constraints, MatchResult, Profile, Scene, TraitVector } from './types';

const NATURE: Record<Scene, number> = { mountain: 90, forest: 85, island: 75, coast: 70, desert: 80, village: 55, city: 10 };

// Places whose food or beauty is the whole point.
const FOOD: Record<string, number> = {
  'quartieri-spagnoli': 95, euljiro: 90, sighnaghi: 90, shodoshima: 80, kanazawa: 85, 'san-cristobal': 75, bukhara: 70,
  kampot: 80, matera: 70, perast: 65, piran: 70, ravello: 80, valparaiso: 70, chiloe: 75, jiufen: 75, lamu: 70,
};
const AESTHETIC: Record<string, number> = {
  naoshima: 98, ravello: 95, vals: 95, gimmelwald: 90, reine: 92, perast: 88, matera: 90, kanazawa: 90, jiufen: 85,
  gasadalur: 92, iona: 80, 'wadi-rum': 88, hampi: 85, monsanto: 80, piran: 82,
};

const c = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Derive the ten-trait profile of an atlas entry from its curated vibe vector. */
export const traitsFor = (d: Destination): TraitVector => {
  const { spontaneity, sensory, comfort, friction } = d.vector;
  return {
    novelty: c(friction * 9 + 5),
    thrill: c(((spontaneity + comfort) / 2) * 9),
    social: c(sensory * 10 - 5),
    pace: c(sensory * 5 + spontaneity * 3 + 10),
    comfort: c((11 - comfort) * 9.5),
    food: FOOD[d.id] ?? 55,
    nature: NATURE[d.scene],
    culture: c(friction * 9.5),
    aesthetic: AESTHETIC[d.id] ?? 70,
    spontaneity: c(spontaneity * 10 - 5),
  };
};

const toCandidate = (d: Destination): Candidate => ({
  name: d.name,
  country: d.country,
  region: d.region,
  traits: traitsFor(d),
  seasonFit: 70,
  travelHours: 0,
  costLevel: 2,
  oneLiner: d.hooks[0].charAt(0).toUpperCase() + d.hooks[0].slice(1) + '.',
});

const TIME_BLOCKS = ['Day 1 · Morning', 'Day 1 · Evening', 'Day 2 · Morning', 'Day 2 · Evening'];

/** Three sentences: how you read, then two real hooks of the place. */
const why = (p: Profile, d: Destination): string => {
  const top = definingTraits(p).slice(0, 3);
  const leans = top.map(({ t, high }) => `${high ? 'high' : 'low'} on ${TRAITS[t].label.toLowerCase()}`);
  const list = leans.length > 1 ? `${leans.slice(0, -1).join(', ')} and ${leans.at(-1)}` : leans[0];
  const quote = top.map(({ t }) => p[t].evidence[0]).find(Boolean);
  const first = quote ? `You chose “${quote}”, and overall you read as ${list}.` : `Your answers read as ${list}.`;
  return `${first} In ${d.name} that means ${d.hooks[0]}. You’ll also find ${d.hooks[1]}, plus ${d.hooks[2]}.`;
};

export const buildEngineMatch = (p: Profile, k: Constraints, ranking: Candidate[], pickName: string): MatchResult => {
  const d = DESTINATIONS.find((x) => x.name === pickName) ?? DESTINATIONS[0];
  const pick = ranking.find((x) => x.name === d.name) ?? ranking[0];
  return {
    source: 'engine',
    archetype: archetypeFor(p),
    archetypeTagline: '',
    destinationName: d.name,
    country: d.country,
    region: d.region,
    whyYouBelong: why(p, d),
    itinerary: d.itinerary.map(([title, description], i) => ({ timeBlock: TIME_BLOCKS[i], title, description })),
    imagePrompt: d.imagePrompt,
    ambienceType: d.ambience,
    scene: d.scene,
    palette: d.palette,
    imageSource: 'procedural',
    pick,
    ranking: ranking.slice(0, 6),
    certainty: Math.round(profileCertainty(p) * 100),
    profile: p,
    constraints: k,
  };
};

/** Ranks the whole atlas; `exclude` lets "somewhere else" walk down the list. */
export const predictWithEngine = (p: Profile, k: Constraints, exclude: string[] = []): MatchResult => {
  const ranking = rankCandidates(p, DESTINATIONS.map(toCandidate), k);
  const pick = ranking.find((r) => !exclude.includes(r.name)) ?? ranking[0];
  return buildEngineMatch(p, k, ranking, pick.name);
};

export const isAtlasPlace = (name: string) => DESTINATIONS.some((d) => d.name === name);
