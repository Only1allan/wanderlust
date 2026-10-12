// The traveller model: ten traits, each a running weighted estimate with a certainty.
import { TRAIT_IDS, clamp, type Candidate, type Constraints, type Profile, type Reading, type TraitId, type TraitVector } from './types';

export const TRAITS: Record<TraitId, { label: string; low: string; high: string; describe: string }> = {
  novelty: { label: 'Novelty', low: 'Familiar', high: 'Uncharted', describe: 'appetite for unfamiliar, unknown places (Plog allocentrism)' },
  thrill: { label: 'Thrill', low: 'Calm', high: 'Adrenaline', describe: 'sensation seeking, physical risk and intensity' },
  social: { label: 'Social energy', low: 'Solitude', high: 'Crowds', describe: 'energy from people, nightlife and buzz vs solitude' },
  pace: { label: 'Pace', low: 'Slow', high: 'Packed', describe: 'how much they want to fit into a day' },
  comfort: { label: 'Comfort', low: 'Rugged', high: 'Pampered', describe: 'need for comfort, hygiene and good beds' },
  food: { label: 'Food', low: 'Fuel', high: 'Pilgrimage', describe: 'how central eating and drinking is to the trip' },
  nature: { label: 'Nature', low: 'Urban', high: 'Wild', describe: 'pull towards wilderness and landscape vs streets and cities' },
  culture: { label: 'Immersion', low: 'Surface', high: 'Deep end', describe: 'tolerance and hunger for language barriers and local customs' },
  aesthetic: { label: 'Aesthetics', low: 'Practical', high: 'Beauty-led', describe: 'how much beauty, design and light drive choices' },
  spontaneity: { label: 'Spontaneity', low: 'Planner', high: 'Improviser', describe: 'planning vs improvising' },
};

const PRIOR_WEIGHT = 0.4;

export const emptyProfile = (): Profile =>
  Object.fromEntries(TRAIT_IDS.map((t) => [t, { mean: 50, weight: PRIOR_WEIGHT, evidence: [] }])) as unknown as Profile;

/** 0-1 certainty for one trait, from how much evidence has accumulated. */
export const traitCertainty = (p: Profile, t: TraitId) => 1 - Math.exp(-(p[t].weight - PRIOR_WEIGHT) / 1.1);

export const profileCertainty = (p: Profile) => TRAIT_IDS.reduce((s, t) => s + traitCertainty(p, t), 0) / TRAIT_IDS.length;

export const applyReadings = (p: Profile, readings: Reading[]): Profile => {
  const next = structuredClone(p);
  for (const r of readings) {
    const s = next[r.trait];
    const w = Math.min(1, Math.max(0.1, r.weight));
    s.mean = (s.mean * s.weight + clamp(r.value, 0, 100, 50) * w) / (s.weight + w);
    s.weight += w;
    const q = r.quote?.trim();
    if (q && !s.evidence.includes(q)) s.evidence = [q, ...s.evidence].slice(0, 3);
  }
  return next;
};

/** Signals attached to a tapped option become readings with the option label as evidence. */
export const readingsFromSignals = (signals: Partial<TraitVector>, quote: string, weight = 0.7): Reading[] =>
  Object.entries(signals)
    .filter(([t]) => (TRAIT_IDS as readonly string[]).includes(t))
    .map(([trait, value]) => ({ trait: trait as TraitId, value: Number(value), weight, quote }));

/** The traits we know least about — what the next scene should probe. */
export const nextTargets = (p: Profile, n = 2, avoid: TraitId[] = []): TraitId[] =>
  [...TRAIT_IDS]
    .sort((a, b) => traitCertainty(p, a) - traitCertainty(p, b) + (avoid.includes(a) ? 0.3 : 0) - (avoid.includes(b) ? 0.3 : 0))
    .slice(0, n);

export const MIN_SCENES = 5;
export const MAX_SCENES = 9;
export const isConfident = (p: Profile, scenes: number) =>
  scenes >= MAX_SCENES || (scenes >= MIN_SCENES && profileCertainty(p) >= 0.5);

/** Traits that define this person: far from neutral and well evidenced. */
export const definingTraits = (p: Profile) =>
  [...TRAIT_IDS]
    .map((t) => ({ t, strength: (Math.abs(p[t].mean - 50) / 50) * traitCertainty(p, t), high: p[t].mean >= 50 }))
    .sort((a, b) => b.strength - a.strength);

const ADJ: Record<TraitId, [string, string]> = {
  novelty: ['Homing', 'Uncharted'],
  thrill: ['Unhurried', 'Feral'],
  social: ['Solitary', 'Gregarious'],
  pace: ['Slow-Burn', 'Restless'],
  comfort: ['Barefoot', 'Velvet-Rope'],
  food: ['Ascetic', 'Hungry'],
  nature: ['Neon', 'Wild-Hearted'],
  culture: ['Gentle', 'Deep-End'],
  aesthetic: ['Pragmatic', 'Aesthetic'],
  spontaneity: ['Itinerary', 'Improvising'],
};
const NOUN: Record<TraitId, [string, string]> = {
  novelty: ['Regular', 'Cartographer'],
  thrill: ['Drifter', 'Daredevil'],
  social: ['Solitarian', 'Diplomat'],
  pace: ['Flâneur', 'Completist'],
  comfort: ['Nomad', 'Voyager'],
  food: ['Minimalist', 'Gourmand'],
  nature: ['Night Owl', 'Wanderer'],
  culture: ['Observer', 'Anthropologist'],
  aesthetic: ['Fixer', 'Romantic'],
  spontaneity: ['Navigator', 'Free Radical'],
};

export const archetypeFor = (p: Profile): string => {
  const [a, b] = definingTraits(p);
  if (!a || a.strength < 0.08) return 'Still reading you…';
  return `The ${ADJ[a.t][a.high ? 1 : 0]} ${NOUN[b.t][b.high ? 1 : 0]}`;
};

export interface FitRow {
  trait: TraitId;
  you: number;
  place: number;
  certainty: number;
  closeness: number;
  weight: number;
}

/** Certainty-weighted closeness between the person and a place, trait by trait. */
export const fitBreakdown = (p: Profile, place: TraitVector) => {
  const rows: FitRow[] = TRAIT_IDS.map((t) => {
    const certainty = traitCertainty(p, t);
    const weight = certainty * (0.35 + Math.abs(p[t].mean - 50) / 50) + 0.02;
    return { trait: t, you: Math.round(p[t].mean), place: place[t], certainty, closeness: 1 - Math.abs(p[t].mean - place[t]) / 100, weight };
  });
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const fit = Math.round((100 * rows.reduce((s, r) => s + r.weight * r.closeness, 0)) / total);
  return { fit, rows };
};

const MAX_HOURS: Record<Constraints['length'], number> = { weekend: 6, week: 16, long: 30 };
const BUDGET_LEVEL: Record<Constraints['budget'], number> = { shoestring: 1, comfortable: 2, splurge: 3 };

export const scoreCandidate = (p: Profile, c: Candidate, k: Constraints): Candidate => {
  const { fit } = fitBreakdown(p, c.traits);
  const notes: string[] = [];
  let penalty = 0;
  if (c.seasonFit < 55) {
    penalty += Math.round((55 - c.seasonFit) * 0.3);
    notes.push(`${k.month} is off-season`);
  }
  if (k.home && c.travelHours > MAX_HOURS[k.length]) {
    penalty += Math.min(18, Math.round((c.travelHours - MAX_HOURS[k.length]) * 0.8));
    notes.push(`~${c.travelHours}h away for a ${k.length === 'long' ? 'long trip' : k.length}`);
  }
  if (c.costLevel > BUDGET_LEVEL[k.budget]) {
    penalty += 10 * (c.costLevel - BUDGET_LEVEL[k.budget]);
    notes.push('pricier than your budget');
  }
  return { ...c, fit, penalty, penaltyNotes: notes, score: fit - penalty };
};

export const rankCandidates = (p: Profile, cs: Candidate[], k: Constraints) =>
  cs.map((c) => scoreCandidate(p, c, k)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

/** Compact human-readable profile for prompts. */
export const describeProfile = (p: Profile) =>
  TRAIT_IDS.map((t) => {
    const c = traitCertainty(p, t);
    const ev = p[t].evidence.length ? ` — evidence: ${p[t].evidence.map((e) => `"${e}"`).join(', ')}` : '';
    return `- ${t} (${TRAITS[t].low} 0 ↔ ${TRAITS[t].high} 100): ${Math.round(p[t].mean)}, certainty ${Math.round(c * 100)}%${ev}`;
  }).join('\n');
