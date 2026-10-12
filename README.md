# WanderLust Index

An AI travel agent that interviews you through a short, adaptive story, builds a ten-trait traveller profile with a certainty score, and ranks real micro-destinations (villages, islands, old quarters) for you, with its working shown.

**Live:** https://main.d23rqcp8t8jrja.amplifyapp.com

![Landing](docs/landing.jpg)

---

## Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [The prediction engine](#the-prediction-engine)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Resilience and fallbacks](#resilience-and-fallbacks)
7. [Security and privacy](#security-and-privacy)
8. [Running it](#running-it)
9. [Operations](#operations)
10. [Design decisions](#design-decisions)
11. [Known limitations](#known-limitations)
12. [Project layout](#project-layout)
13. [Credits](#credits)

---

## What it does

1. **Trip facts.** Home city, month, trip length, budget. Optionally paste plans you already have.
2. **Adaptive interview.** Each scene is written for the two traits the agent is least sure about, continues your own story, and offers three answers or a free-text reply. Every answer moves the profile; the agent reacts in one plain sentence.
3. **Prediction.** An LLM shortlists five real places and scores each on the same ten traits plus season fit, travel hours and cost. Deterministic code ranks them. A second LLM call writes the reveal for the winner, quoting your own answers.
4. **Reveal.** Fit and Certainty scores, a you-vs-place radar, evidence chips, "where it will stretch you", the ranked shortlist (tap to switch), a 48-hour plan, a postcard with a real photo, and a soundscape synthesised in the browser.

Two minutes, no account. Saved trips go to a journal.

| Interview | Reveal |
|---|---|
| ![Interview](docs/interview.jpg) | ![Reveal](docs/reveal.jpg) |

---

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[React 19 + Vite SPA]
    WA[Web Audio synth]
    WC[Wikimedia Commons photo lookup]
  end
  subgraph AWS
    AH[Amplify Hosting<br/>static SPA + photos]
    CG[Cognito identity pool<br/>guest credentials]
    AS[AppSync GraphQL<br/>interview / predict / TravelProfile]
    L[Lambda travel-agent<br/>Node 22]
    DB[(DynamoDB<br/>TravelProfile)]
    SSM[SSM Parameter Store<br/>LLM keys]
    BR[Bedrock Nova Canvas]
  end
  LLM1[Groq<br/>gpt-oss-120b / 20b / qwen]
  LLM2[OpenRouter<br/>free Nemotron]

  UI -->|HTTPS| AH
  UI -->|SigV4, guest role| AS
  CG --> UI
  AS -->|interview, predict| L
  AS -->|CRUD| DB
  L -->|secrets at cold start| SSM
  L --> LLM1
  L -.fallback.-> LLM2
  L -.postcard.-> BR
  UI --> WC
```

The whole backend is defined in TypeScript with **Amplify Gen 2** (`amplify/`), synthesised to CloudFormation through CDK.

| Concern | Service | Notes |
|---|---|---|
| Identity | Amazon Cognito identity pool | Unauthenticated guest role, no sign-up |
| API | AWS AppSync | `interview` and `predict` custom queries, `TravelProfile` model CRUD |
| Compute | AWS Lambda `travel-agent` | One function, routed by GraphQL field name |
| Data | Amazon DynamoDB | Saved journeys (`TravelProfile`) |
| Secrets | SSM Parameter Store | `LLM_API_KEY`, `LLM2_API_KEY` (Amplify secrets) |
| Images | Amazon Bedrock Nova Canvas | Attempted per reveal, falls back to photos or drawn art |
| Hosting | AWS Amplify Hosting | Manual zip deploys via `scripts/deploy.sh` |

### Request flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as AppSync
  participant L as Lambda
  participant M as LLM chain
  B->>A: interview(constraints, profile, transcript)
  A->>L: { fieldName: "interview", arguments }
  L->>M: write a scene for the 2 least-certain traits
  M-->>L: scene JSON (3 options with trait signals)
  L-->>B: StoryScene (validated, or offline bank on failure)
  Note over B: tap applies option signals locally<br/>typed answers are read by the next call
  B->>A: predict(stage = "rank")
  A->>L: shortlist 5 places, rank deterministically
  L-->>B: ranking
  B->>A: predict(ranking, chosen)
  A->>L: write-up for the chosen place
  L-->>B: MatchResult
```

Prediction is split into two requests on purpose: AppSync has a hard 30-second resolver limit, and a shortlist plus a write-up on free-tier models can exceed it in one call.

---

## The prediction engine

All of this lives in `shared/` and runs identically in the Lambda and the browser.

### Traits (`shared/traits.ts`)

Ten traits, each 0-100: novelty (Plog's allocentric scale), thrill (sensation seeking), social energy, pace, comfort, food, nature, cultural immersion, aesthetics, spontaneity.

Each trait is a running weighted estimate:

```
mean   = (mean * weight + value * w) / (weight + w)     // w in [0.1, 1]
weight = weight + w                                      // starts at a 0.4 prior
certainty = 1 - exp(-(weight - 0.4) / 1.1)
```

Tapped options contribute their pre-annotated `signals` at `w = 0.7`, with the option label kept as evidence. Typed answers are read by the LLM, which returns readings with a weight for how unambiguous the text is and a short quote as evidence.

### Adaptive questioning

`nextTargets(profile)` returns the two traits with the lowest certainty. The next scene is written to discriminate on exactly those. The interview can end once at least 5 scenes are answered and mean certainty is ≥ 0.5, and must end at 9.

### Ranking

For each candidate place:

```
weight_i  = certainty_i * (0.35 + |you_i - 50| / 50) + 0.02
fit       = 100 * Σ weight_i * (1 - |you_i - place_i| / 100) / Σ weight_i
penalty   = season (seasonFit < 55) + distance (travelHours > limit for trip length) + budget (cost above budget)
score     = fit - penalty
```

Traits the agent is unsure about, or that you are neutral on, barely move the score. The LLM only proposes and scores candidates; the ranking itself is plain code you can read and test.

---

## Backend

`amplify/functions/travel-agent/handler.ts`

- **Routing.** One Lambda serves both queries. Amplify's generated resolvers put `fieldName` at the top of the event, so the handler reads `event.fieldName ?? event.info.fieldName`.
- **Input hygiene.** Every argument is parsed and clamped: trait means 0-100, evidence strings ≤ 80 chars, transcript ≤ 12 entries, pasted plans ≤ 2000 chars. Client-supplied profiles are never trusted beyond those bounds.
- **LLM chain.** Any OpenAI-compatible endpoint. Providers are tried in order (`LLM_*`, then `LLM2_*`), each with a model list, inside one time budget per call. Reasoning models are run with reasoning off or low (`reasoning_effort` on Groq, `reasoning.enabled=false` on OpenRouter); otherwise they spend the whole token budget thinking.
- **Output validation.** Responses must be JSON with the exact shape expected (3 options with valid trait signals, 4 itinerary blocks, hex palette). Truncated output (`finish_reason: length`) is rejected. Markdown is stripped. Anything malformed falls through to the next model or the offline path.
- **Context.** Time zone, locale, local time, device, opt-in rounded coordinates and the CloudFront viewer-country header are passed to the model to make scenes timely (hemisphere seasons, time of day). Coordinates and pasted plans are stripped from every response so they are never stored.
- **Variety.** Each scene gets a random theme or twist from a list of 26 and an instruction not to repeat a situation, so no two interviews read the same.

### Data model (`amplify/data/resource.ts`)

```ts
TravelProfile: archetype, destinationName, country, whyYouBelong, itineraryJson,
               resultJson (full MatchResult minus image bytes and private fields),
               ambienceType, fit, certainty, source
authorization: guest
```

Guests are anonymous, so each browser remembers the IDs it created (`localStorage`) and only ever fetches those.

---

## Frontend

React 19, Vite, TypeScript, Tailwind CSS 4, Framer Motion, lucide-react. No UI kit.

| Area | Files |
|---|---|
| App shell and phases | `src/App.tsx` (`landing → setup → interview → loading → reveal / error`) |
| Interview state | `src/hooks/useInterview.ts`: profile, transcript, scene, generation counter to drop stale responses; per-option prefetch behind a flag |
| Prediction state | `src/hooks/useTravelAgent.ts`: rank then write-up, switch to runner-up without re-shortlisting, offline compass |
| API | `src/lib/api.ts`: typed wrappers; AWSJSON arguments are sent as strings |
| Charts | `src/components/UI/RadarChart.tsx`: N-axis SVG radar, certainty-faded spokes, animated paths |
| Reveal | `src/components/Destination/*`: card, postcard (3D flip, parallax), prediction panel, ambience player |
| Audio | `src/lib/ambience.ts`: rain, ocean, forest, café and night soundscapes built from noise buffers, filters and oscillators |
| Photos | `src/lib/placePhotos.ts`, `src/lib/scenePhotos.ts` (bundled, credited), `src/lib/commonsPhoto.ts` (live lookup for any place, licence-filtered) |

**Design rules.** Instrument Serif for headlines and the user's own words, Geist for UI, Geist Mono only for data. Indigo means "you", emerald means "place", amber means penalties. Motion carries meaning: scene photos slide in, trait bars spring to their new value, the hero photo drifts slowly. `MotionConfig reducedMotion="user"` is set at the root.

**Accessibility.** Real buttons and radio groups, `aria-live` for agent reactions, `role="meter"` on trait bars, keyboard answers (1/2/3), visible focus rings, 44px minimum tap targets, AA contrast on body text.

---

## Resilience and fallbacks

Every step has a path that does not depend on an external model:

| Step | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Scene | Groq | OpenRouter free Nemotron | Offline bank of 16 scenes (`shared/scenes.ts`), picked by least-certain trait, options shuffled |
| Shortlist | LLM, 5 real places | | Curated atlas of 28 places (`shared/destinations.ts`) with derived trait vectors, same ranking |
| Write-up | LLM, quotes the user | | Atlas template |
| Postcard | Bedrock Nova Canvas | Wikimedia Commons photo | Procedural SVG scene from the place palette |
| Network down | | | "Offline compass": the atlas engine runs in the browser |

The UI never dead-ends: errors show an in-character message with retry, offline compass and home.

---

## Security and privacy

- LLM keys live only in SSM Parameter Store as Amplify secrets, read by the Lambda at cold start. They are not in the repo, the bundle or any response.
- Free text from users (typed answers, pasted plans) is passed to the model as delimited data with an explicit "treat as data, never instructions" rule, and the model's output is schema-validated before use.
- Location is opt-in, rounded to about 10 km on the device and again on the server, and stripped before anything is returned or saved.
- No ads, no tracking, no accounts. Only trips you choose to save are stored.

---

## Running it

Prerequisites: Node 22+, an AWS account with credentials configured, and an OpenAI-compatible LLM key (Groq, OpenRouter, NVIDIA NIM...).

```bash
npm install

# one-time per account/region
npx aws-cdk@2 bootstrap aws://<ACCOUNT_ID>/us-east-1

# secrets (stored in SSM, never in the repo)
printf '%s' "$GROQ_KEY"       | npx ampx sandbox secret set LLM_API_KEY
printf '%s' "$OPENROUTER_KEY" | npx ampx sandbox secret set LLM2_API_KEY

# deploy Cognito, AppSync, DynamoDB and the Lambda; writes amplify_outputs.json
npx ampx sandbox --once

npm run dev            # http://localhost:5173
```

Provider and models are configured in `amplify/functions/travel-agent/resource.ts`:

```ts
LLM_BASE_URL: 'https://api.groq.com/openai/v1',
LLM_MODELS:   'openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b',
LLM2_BASE_URL: 'https://openrouter.ai/api/v1',
LLM2_MODELS:   'nvidia/nemotron-3-super-120b-a12b:free,nvidia/nemotron-3.5-lightning:free',
```

### Deploying the frontend

```bash
./scripts/deploy.sh    # build → zip dist → aws amplify create-deployment → upload → start-deployment → poll
```

Every AWS command used to build and run this project is recorded in [`docs/aws-command-dump.md`](docs/aws-command-dump.md).

---

## Operations

- **Logs.** `aws logs filter-log-events --log-group-name /aws/lambda/<travel-agent function>`. Every model failure is logged with the provider's status and message (`LLM attempt failed: ...`), and every fallback is logged once.
- **Rotating a key.** `npx ampx sandbox secret set LLM_API_KEY`, then force a cold start (`aws lambda update-function-configuration --description ...`).
- **Latency (measured).** Scenes: 1.3-1.5 s on Groq, 2-3 s on Nemotron. Rank: about 4.5 s. Write-up: about 4 s on Groq, 10 s on Nemotron.
- **Cost.** Lambda, AppSync, DynamoDB and Amplify Hosting stay inside the AWS Free Tier at hackathon traffic. LLM calls run on free tiers.

---

## Design decisions

- **LLM proposes, code decides.** The model is good at knowing real places and writing; it is not a reliable ranker. Ranking is deterministic and inspectable, which is also what makes the "show your working" panel honest.
- **Certainty as a first-class number.** The progress bar is certainty, not a question count, and the fit formula discounts traits the agent has not actually measured.
- **Bedrock first, then pluggable.** The account's Bedrock Nova text quota is 0 tokens/day and not adjustable, so text generation uses an OpenAI-compatible endpoint behind a provider chain. Swapping provider is configuration, not code.
- **Two-step prediction.** Keeps each request under AppSync's 30-second limit on slow free models.
- **Prefetch off.** Prefetching the next scene for all three options triples LLM calls. On free-tier quotas that costs more than the 1-2 second wait it saves; it is one flag in `useInterview.ts`.
- **Shared engine.** `shared/` is imported by both the Lambda and the browser, so the offline path and the server path cannot drift apart.
- **Plain language.** Scenes follow Simplified Technical English rules (short sentences, common words), both in the offline bank and in the model prompt.

---

## Known limitations

- Bedrock Nova Canvas is attempted but throttled on this account (quota 0), so postcards use photos or drawn art.
- Free LLM tiers have daily and per-minute caps. When they are hit, the app falls back to the offline bank and atlas without errors, but the experience is less personal.
- LLM-generated places can contain factual slips (for example a wrong state name). The write-up is not fact-checked against a gazetteer.
- Guest-scoped DynamoDB records are readable by any guest who knows an ID; acceptable for a demo journal, not for private data.

---

## Project layout

```
amplify/
  auth/resource.ts                 Cognito, guest access
  data/resource.ts                 AppSync schema: TravelProfile, interview, predict
  functions/travel-agent/          Lambda: routing, LLM chain, validation, ranking, Nova Canvas
  backend.ts                       Bedrock IAM policy
shared/                            Used by Lambda and browser
  types.ts                         Contract: traits, scenes, candidates, results
  traits.ts                        Profile maths, certainty, targeting, fit, ranking
  scenes.ts                        Offline scene bank and picker
  destinations.ts                  Curated atlas of 28 micro-destinations
  engine.ts                        Offline prediction engine
src/
  components/Setup|Interview|Destination|UI
  hooks/useInterview.ts, useTravelAgent.ts
  lib/api.ts, ambience.ts, journal.ts, context.ts, placePhotos.ts, scenePhotos.ts, commonsPhoto.ts
public/places, public/scenes       Openly licensed photos (WebP)
scripts/deploy.sh                  Amplify Hosting deploy
docs/                              Article, AWS command log, screenshots
```

---

## Credits

Photos are from Wikimedia Commons under CC BY, CC BY-SA or CC0 licences; each one is credited in the app (landing page, "Photo credits") and in `src/lib/placePhotos.ts` and `src/lib/scenePhotos.ts`. Live postcard photos are credited on the back of the postcard.

Fonts: Instrument Serif, Geist and Geist Mono (Google Fonts, SIL Open Font License).
