# WanderLust : a travel agent that interviews you instead of handing you a form

*Tags: agent, aws-amplify, aws-lambda, amazon-dynamodb, amazon-bedrock*

## What your agent does

Every travel quiz I've ever taken asks the same thing: beaches or mountains? I always answer, and the answer never tells it anything useful. Two people can both say "mountains" and want completely different trips. One wants a spa with a view. The other wants to sleep in a hammock on a ridge and eat whatever the shepherd is having.

WanderLust Index is my attempt at a better question. It's an AI travel agent that interviews you through a short story, works out what kind of traveller you are, and then picks one small, specific place for you. Not a country. Something like a single island or one neighbourhood. You get a 48-hour plan, a postcard, and a soundscape for the place that your browser generates on the spot.

It's for anyone who has stared at a booking site with forty tabs open and felt nothing. You answer five to eight little scenes, and it explains its pick well enough that you can argue with it.

## How you built it

The whole thing runs on AWS, built with Amplify Gen 2, so the backend is TypeScript in the same repo as the React app. Amazon Cognito hands every visitor anonymous guest credentials, which means nobody has to sign up. AWS AppSync exposes two GraphQL queries, `interview` and `predict`, plus the usual CRUD for saved trips. Both queries hit one AWS Lambda function (Node 22) that is the agent itself. Saved journeys go into Amazon DynamoDB, the frontend is on AWS Amplify Hosting, and the LLM key lives in SSM Parameter Store as an Amplify secret.

The agent keeps a profile of ten traits. Some come from tourism research, like Plog's scale of how much someone craves the unfamiliar and the sensation-seeking literature. Others are just practical, like pace, comfort, food and how much you want nature over streets. Each trait has an estimate, a certainty, and the exact words from your answers that moved it.

The interview is adaptive. Before each scene, the Lambda finds the two traits it's least sure about and asks the model to write a scene that tells people apart on exactly those. Each of the three answers carries trait signals, so tapping one updates your profile on the spot. You can also type your own answer, and the model reads it and quotes it back as evidence. While you're reading a scene, the next scene for every option is already being written in the background, so it rarely makes you wait.

No two interviews are the same. Each scene gets a random theme or twist (an overnight train, lost luggage, a dinner invitation from a shop owner), and the model is told never to repeat a situation. It also gets light context that the browser already knows: your time zone, language, local time and whether you're on a phone. So a 2am session gets night scenes, and December in Nairobi isn't treated like December in Oslo. Precise location is opt-in, rounded to about 10 km, and never stored. If you already have plans, you can paste them in. The agent reads them before the first scene, pulls traits from them, and then looks for a place that fits around the trip you've already booked.

The prediction isn't "ask the LLM where to go". The model proposes six real candidate places and scores each one on the same ten traits, plus season fit, travel time from your home city and cost. Then plain code in the Lambda ranks them. It weights each trait by how certain the profile is, and it subtracts points for off-season months, long flights on a short trip, or blowing your budget. A second call writes the reveal for the winner, and it has to quote your own answers.

The biggest challenge came on day one. My new account's Amazon Bedrock quota for Nova models turned out to be zero tokens per day, and the quota isn't adjustable. Every Converse call came back throttled. So text generation goes through an OpenAI-compatible endpoint (OpenRouter while I built it; Groq or NVIDIA NIM is a config change). Bedrock is still wired in for Nova Canvas postcards, and the app falls back to generated SVG art until that quota opens. I also built an offline engine: a hand-curated atlas of 28 micro-destinations and a bank of written scenes, ranked with the same maths. If the model or the network dies, the experience still works.

## The experience

The one thing I care about is that it feels like it's actually listening.

When your flight is six hours late and you pick "Take a taxi into the city", the agent answers "You like a surprise. Noted." Then the next scene picks up the story from there. I kept the language deliberately plain, in the spirit of Simplified Technical English: short sentences, common words, no slang. Early drafts were full of jokes, and they got in the way of a simple question about how you travel. A live radar on the side changes shape as you answer, and it shows you which traits the current scene is probing. There's no fixed question count. The progress bar is the agent's certainty, and when it's confident enough it says "I've got a read on you" and lets you reveal or keep going.

The reveal shows its working. You get a Fit score and a separate Certainty score, a radar of you against the place, and the answers that drove the match ("because you chose 'Point at another table'"). It also tells you where the place will stretch you, which I think makes the whole thing more believable. Below that is the full shortlist with scores and penalty notes. Tap any runner-up to switch. The postcard shows a real photo of the place, pulled live from Wikimedia Commons with the photographer and licence on the back, and it falls back to drawn art if no good photo exists.

How I know it worked: I played it as two opposite people. One was a planner who books the spa when it rains. The other orders whatever the locals are eating and says yes when a fisherman offers a sunrise trip to a sea cave. The live read, the archetype and the final shortlist went in completely different directions, and each reveal could point to the exact answers behind it. The part I keep arguing with is the stretch line. It told me a pick "runs hotter" on aesthetics than I do, and my first reaction was to defend myself to a web page. I'll take that as a sign it's reading something.

## Proof it works

- Live app: https://main.d23rqcp8t8jrja.amplifyapp.com
- Source code: https://github.com/Only1allan/wanderlust
- Screenshots: the interview with the live trait radar, the reveal with Fit and Certainty, and the "Why the engine picked it" panel are in the repo under `docs/`.

Try "Surprise me" for a ten-second demo, or "Find my place" for the full interview. Save a result and it lands in your travel journal in DynamoDB.
