import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { travelAgent } from '../functions/travel-agent/resource';

const schema = a.schema({
  TravelProfile: a
    .model({
      archetype: a.string().required(),
      destinationName: a.string().required(),
      country: a.string().required(),
      whyYouBelong: a.string().required(),
      itineraryJson: a.json().required(),
      /** The full MatchResult (ranking, profile, constraints) minus any image bytes. */
      resultJson: a.json(),
      ambienceType: a.string(),
      fit: a.integer(),
      certainty: a.integer(),
      source: a.string(),
    })
    .authorization((allow) => [allow.guest()]),

  /** Writes the next adaptive interview scene, reading any typed answer to the previous one. */
  interview: a
    .query()
    .arguments({
      constraints: a.json().required(),
      profile: a.json().required(),
      transcript: a.json().required(),
      seen: a.string().array(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(travelAgent)),

  /** Shortlists, ranks and writes up the best micro-destination for a finished profile. */
  predict: a
    .query()
    .arguments({
      constraints: a.json().required(),
      profile: a.json().required(),
      transcript: a.json().required(),
      exclude: a.string().array(),
      ranking: a.json(),
      chosen: a.string(),
      /** 'rank' returns only the ranked shortlist; anything else writes up the pick. */
      stage: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(travelAgent)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'identityPool' },
});
