// Shared contract between the React app and the travel-agent Lambda.

export const TRAIT_IDS = [
  'novelty',
  'thrill',
  'social',
  'pace',
  'comfort',
  'food',
  'nature',
  'culture',
  'aesthetic',
  'spontaneity',
] as const;
export type TraitId = (typeof TRAIT_IDS)[number];

/** 0-100 on every trait. */
export type TraitVector = Record<TraitId, number>;

export interface TraitState {
  mean: number;
  /** Accumulated evidence weight (includes a soft prior). */
  weight: number;
  /** Short phrases from the user's own answers that moved this trait. */
  evidence: string[];
}
export type Profile = Record<TraitId, TraitState>;

export interface Reading {
  trait: TraitId;
  value: number;
  weight: number;
  quote?: string;
}

export const AMBIENCES = ['rain', 'ocean', 'forest', 'cafe', 'night'] as const;
export type Ambience = (typeof AMBIENCES)[number];

export const SCENES = ['mountain', 'coast', 'island', 'desert', 'city', 'forest', 'village'] as const;
export type Scene = (typeof SCENES)[number];

export const TRIP_LENGTHS = ['weekend', 'week', 'long'] as const;
export type TripLength = (typeof TRIP_LENGTHS)[number];
export const BUDGETS = ['shoestring', 'comfortable', 'splurge'] as const;
export type Budget = (typeof BUDGETS)[number];

/** Signals that make each person's interview different. Collected openly, never stored. */
export interface ClientContext {
  timezone?: string;
  locale?: string;
  /** e.g. "Sunday 02:15" in the visitor's own time zone. */
  localTime?: string;
  device?: 'mobile' | 'desktop';
  /** Opt-in only, rounded to ~10 km. */
  coords?: { lat: number; lon: number };
  /** From the edge (CloudFront viewer country), filled in server side. */
  country?: string;
}

export interface Constraints {
  home: string;
  month: string;
  length: TripLength;
  budget: Budget;
  /** Optional plans the visitor already has, pasted as free text. */
  itinerary?: string;
  context?: ClientContext;
}

export interface SceneOption {
  label: string;
  detail: string;
  /** What the agent says if you pick this. */
  reaction: string;
  signals: Partial<TraitVector>;
}

/** A scene of the adaptive interview, written to probe the least-certain traits. */
export interface StoryScene {
  id: string;
  setting: string;
  prompt: string;
  options: SceneOption[];
  targets: TraitId[];
  /** Agent's reading of a typed answer to the previous scene. */
  lastReadings?: Reading[];
  lastReaction?: string;
  source: 'ai' | 'static';
}

export interface TranscriptEntry {
  setting: string;
  prompt: string;
  options: string[];
  choice?: number;
  freeText?: string;
}

export interface Candidate {
  name: string;
  country: string;
  region: string;
  traits: TraitVector;
  seasonFit: number;
  travelHours: number;
  costLevel: 1 | 2 | 3;
  oneLiner: string;
  /** Certainty-weighted trait fit, 0-100. */
  fit?: number;
  /** Constraint penalty points subtracted from fit. */
  penalty?: number;
  penaltyNotes?: string[];
  score?: number;
}

export interface ItineraryBlock {
  timeBlock: string;
  title: string;
  description: string;
}

export interface MatchResult {
  source: 'ai' | 'engine';
  model?: string;
  archetype: string;
  archetypeTagline: string;
  destinationName: string;
  country: string;
  region: string;
  whyYouBelong: string;
  itinerary: ItineraryBlock[];
  imagePrompt: string;
  ambienceType: Ambience;
  scene: Scene;
  palette: [string, string, string];
  imageDataUrl?: string;
  imageSource: 'nova-canvas' | 'procedural';
  /** The chosen candidate, with its fit, penalties and trait scores. */
  pick: Candidate;
  /** Every shortlisted place, best first. */
  ranking: Candidate[];
  versusRunnerUp?: string;
  /** Profile certainty 0-100 at prediction time. */
  certainty: number;
  profile: Profile;
  constraints: Constraints;
}

export const clamp = (n: unknown, lo: number, hi: number, fallback: number): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
};

export const isTrait = (t: unknown): t is TraitId => TRAIT_IDS.includes(t as TraitId);
