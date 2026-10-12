# AWS Command Dump: WanderLust Index

Every AWS command run while building WanderLust Index, in order, with what it was for and what happened.
Account `773195032541`, region `us-east-1`. Secret values are redacted.

---

## 1. Account and tooling checks

```bash
aws --version
aws sts get-caller-identity
aws configure get region
```
Confirmed AWS CLI v2.36, IAM user `organicLavishness`, default region `us-east-1`.

## 2. Bedrock model discovery and access checks

```bash
# Which Nova models exist in the region
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'nova')].modelId" --output text

# Image-output models (looking for Nova Canvas)
aws bedrock list-foundation-models --region us-east-1 --by-output-modality IMAGE \
  --query "modelSummaries[].modelId" --output text

# Entitlement / authorization status
aws bedrock get-foundation-model-availability --model-id amazon.nova-canvas-v1:0 --region us-east-1
aws bedrock get-foundation-model-availability --model-id amazon.nova-lite-v1:0 --region us-east-1
```
Result: Nova Lite and Nova Canvas reported `AUTHORIZED` / `AVAILABLE`.

## 3. Bedrock invocation tests (all throttled)

```bash
# Nova Lite text
aws bedrock-runtime converse --region us-east-1 --model-id us.amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]' \
  --query 'output.message.content[0].text'

# Nova Canvas image
echo '{"taskType":"TEXT_IMAGE","textToImageParams":{"text":"misty alpine village at dawn"},"imageGenerationConfig":{"numberOfImages":1,"width":512,"height":512}}' > body.json
aws bedrock-runtime invoke-model --region us-east-1 --model-id amazon.nova-canvas-v1:0 \
  --body fileb://body.json out.json

# Other Nova variants and regions
for m in us.amazon.nova-2-lite-v1:0 us.amazon.nova-micro-v1:0 us.amazon.nova-pro-v1:0 \
         amazon.nova-lite-v1:0 global.amazon.nova-2-lite-v1:0; do
  aws bedrock-runtime converse --region us-east-1 --model-id $m \
    --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]' \
    --query 'output.message.content[0].text'
done
aws bedrock-runtime converse --region us-west-2 --model-id us.amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"hi"}]}]'
aws bedrock-runtime converse --region eu-west-1 --model-id us.amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"hi"}]}]'

# Non-Nova models
aws bedrock-runtime converse --region us-east-1 --model-id ai21.jamba-1-5-mini-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]'
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'gpt') || contains(modelId,'openai')].modelId" --output text
aws bedrock-runtime converse --region us-east-1 --model-id openai.gpt-oss-20b-1:0 \
  --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]'
aws bedrock-runtime converse --region us-east-1 --model-id openai.gpt-5.6-luna \
  --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]'
aws bedrock-runtime converse --region us-east-1 --model-id openai.gpt-6-luna \
  --messages '[{"role":"user","content":[{"text":"Say hi in 3 words"}]}]'
```
Result: every call returned `ThrottlingException: Too many tokens per day` (or `AccessDeniedException` for the OpenAI models).

## 4. Diagnosing the throttling: service quotas and billing

```bash
# Nova quotas
aws service-quotas list-service-quotas --service-code bedrock --region us-east-1 \
  --query "Quotas[?contains(QuotaName,'Nova') && (contains(QuotaName,'per day') || contains(QuotaName,'tokens per minute'))].[QuotaName,Value,Adjustable]" \
  --output text

# Any non-zero inference quotas at all
aws service-quotas list-service-quotas --service-code bedrock --region us-east-1 \
  --query "Quotas[?Value>\`0\` && (contains(QuotaName,'tokens per minute') || contains(QuotaName,'requests per minute'))].[QuotaName,Value]" \
  --output text
aws service-quotas list-service-quotas --service-code bedrock --region us-east-1 \
  --query "Quotas[?contains(QuotaName,'per day') && Value>\`0\`].[QuotaName,Value]" --output text

# Month-to-date spend
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-10-12 \
  --granularity MONTHLY --metrics UnblendedCost --region us-east-1
```
Finding: every Nova "tokens per day" quota on this account is `0.0` and not adjustable (a new-account restriction).
Decision: generate text through OpenRouter, and keep AWS for compute, API, data, auth and hosting.

## 5. Amplify Gen 2 backend: secrets, bootstrap, deploy

```bash
# Looking for an existing secret or Amplify app
aws ssm describe-parameters --region us-east-1 \
  --query "Parameters[?contains(Name,'OPENROUTER') || contains(Name,'amplify')].Name" --output text
aws amplify list-apps --region us-east-1 --query "apps[].[name,appId]" --output text

# CDK bootstrap check, then bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit --region us-east-1 \
  --query "Stacks[0].StackStatus" --output text
npx aws-cdk@2 bootstrap aws://773195032541/us-east-1

# OpenRouter key stored as an Amplify secret (SSM SecureString). Placeholder first, then the real key.
echo "placeholder-set-real-key" | npx ampx sandbox secret set OPENROUTER_API_KEY
printf '%s' '<REDACTED>' | npx ampx sandbox secret set OPENROUTER_API_KEY
npx ampx sandbox secret list

# Deploy the backend: Cognito, AppSync, DynamoDB, Lambda (run after every backend change)
npx ampx sandbox --once
```
Result: stack `amplify-wanderlustindex-organiclavishness-sandbox-058335aa97` deployed.
AppSync endpoint: `https://i56vuwe7hbhtpceyahuhuhds4e.appsync-api.us-east-1.amazonaws.com/graphql`.

## 6. Lambda: pick up the new secret and smoke test

```bash
FN=$(aws lambda list-functions --region us-east-1 \
  --query "Functions[?contains(FunctionName,'travelagent')].FunctionName" --output text)

# Touch the config to force a cold start, so the function re-reads the secret
aws lambda update-function-configuration --function-name $FN --region us-east-1 \
  --description "travel-agent $(date +%s)"
aws lambda wait function-updated --function-name $FN --region us-east-1

# Direct invoke with a test event
echo '{"arguments":{"spontaneity":8,"sensory":3,"comfort":7,"friction":9}}' > /tmp/wl-ev.json
aws lambda invoke --function-name $FN --region us-east-1 \
  --cli-binary-format raw-in-base64-out --payload file:///tmp/wl-ev.json /tmp/wl-out.json
```
Result: about 6 s round trip, with Nova Lite (via OpenRouter) returning a full match.

## 7. Reading the secret for local tests

```bash
PNAME=$(aws ssm describe-parameters --region us-east-1 \
  --query "Parameters[?contains(Name,'OPENROUTER_API_KEY')].Name" --output text)
export OPENROUTER_API_KEY=$(aws ssm get-parameter --region us-east-1 --name "$PNAME" \
  --with-decryption --query Parameter.Value --output text)
```
Used to run the Lambda handler locally with `npx tsx`. The value is only exported into the shell, never printed or written to a file.

## 8. Amplify Hosting (frontend)

```bash
# One-time: create the hosting app and production branch
aws amplify create-app --name wanderlust-index --platform WEB --region us-east-1 \
  --query "app.[appId,defaultDomain]" --output text          # → d23rqcp8t8jrja
aws amplify create-branch --app-id d23rqcp8t8jrja --branch-name main --stage PRODUCTION --region us-east-1
```

Every frontend deploy (`wanderlust-index/scripts/deploy.sh`):
```bash
npm run build
(cd dist && zip -qr /tmp/wl-dist.zip .)
read -r JOB URL < <(aws amplify create-deployment --app-id d23rqcp8t8jrja --branch-name main \
  --region us-east-1 --query '[jobId,zipUploadUrl]' --output text)
curl -sf -X PUT -H 'Content-Type: application/zip' --upload-file /tmp/wl-dist.zip "$URL"
aws amplify start-deployment --app-id d23rqcp8t8jrja --branch-name main --job-id "$JOB" --region us-east-1
aws amplify get-job --app-id d23rqcp8t8jrja --branch-name main --job-id "$JOB" --region us-east-1 \
  --query 'job.summary.status' --output text
```
Live URL: **https://main.d23rqcp8t8jrja.amplifyapp.com**

---

## AWS services in use

| Service | Role |
|---|---|
| AWS Amplify Gen 2 | Backend-as-code (TypeScript CDK) and hosting the React app |
| Amazon Cognito (identity pool) | Anonymous guest credentials for every visitor |
| AWS AppSync | GraphQL API: `interview`, `predict`, and `TravelProfile` CRUD |
| AWS Lambda (Node 22) | `travel-agent`: adaptive interview, ranking engine, LLM orchestration |
| Amazon DynamoDB | Saved journeys (`TravelProfile` table) |
| AWS Systems Manager Parameter Store | `OPENROUTER_API_KEY` secret |
| AWS CloudFormation / CDK | Stack deployment (bootstrap + sandbox) |
| Amazon Bedrock (Nova Canvas) | Postcard generation attempt; falls back to generated art while the quota is 0 |

---

## 9. Pluggable LLM provider: `LLM_API_KEY` secret (2026-10-12)

The Lambda now talks to any OpenAI-compatible endpoint (OpenRouter, Groq, NVIDIA NIM…) via `LLM_BASE_URL` + `LLM_MODELS`
and a new `LLM_API_KEY` secret. The existing key was copied across without being printed:

```bash
PNAME=$(aws ssm describe-parameters --region us-east-1 \
  --query "Parameters[?contains(Name,'OPENROUTER_API_KEY')].Name" --output text)
aws ssm get-parameter --region us-east-1 --name "$PNAME" --with-decryption \
  --query Parameter.Value --output text | tr -d '\n' | npx ampx sandbox secret set LLM_API_KEY
```

To switch provider later (e.g. Groq):
```bash
printf '%s' '<NEW_PROVIDER_KEY>' | npx ampx sandbox secret set LLM_API_KEY
# then edit LLM_BASE_URL / LLM_MODELS in amplify/functions/travel-agent/resource.ts and redeploy:
npx ampx sandbox --once
```

## 10. Backend redeploy for prediction engine v2 (2026-10-12 ~01:55 local)

```bash
cd wanderlust-index
npx ampx sandbox --once
```
Replaced the `findMatch` query with `interview` + `predict` (same `travel-agent` Lambda), added `resultJson`/`fit`/`certainty`
to the `TravelProfile` DynamoDB model, and switched the function env to `LLM_BASE_URL` / `LLM_MODELS` / `LLM_API_KEY`.
Result: deployment completed in ~123 s; AppSync endpoint unchanged.

## 11. Lambda hotfix redeploy (2026-10-12 ~01:59 local)

```bash
cd wanderlust-index && npx ampx sandbox --once
```
Fix: Amplify's generated AppSync JS resolvers pass `fieldName` at the top level of the Lambda event (not under `info`), so the
`interview`/`predict` router read it from the wrong place. Deployed in ~32 s.

## 12. Frontend deploy: adaptive interview UI (2026-10-12 ~02:10 local)

```bash
cd wanderlust-index && ./scripts/deploy.sh
# = npm run build → zip dist → aws amplify create-deployment → curl PUT zip → aws amplify start-deployment → aws amplify get-job (poll)
```
Shipped the constraints screen, adaptive interview, Fit/Certainty reveal and the "show your working" panel to
https://main.d23rqcp8t8jrja.amplifyapp.com

## 13. Backend redeploy: offline-engine copy fix (2026-10-12 ~02:15 local)

```bash
cd wanderlust-index && npx ampx sandbox --once
```
Shipped the reworded fallback-engine "why you belong" sentences and the empty fallback tagline to the `travel-agent` Lambda.

## 14. Backend + frontend redeploy: engine wording (2026-10-12 ~02:25 local)

```bash
cd wanderlust-index
npx ampx sandbox --once      # Lambda: fallback "why you belong" rewritten as exactly three sentences
./scripts/deploy.sh          # Amplify Hosting: same shared engine used by the browser's offline compass
```

## 15. Backend + frontend redeploy: Simplified Technical English scenes (2026-10-12 ~02:35 local)

```bash
cd wanderlust-index
npx ampx sandbox --once      # Lambda: interview prompt now enforces Simplified Technical English; offline scene bank rewritten
./scripts/deploy.sh          # Amplify Hosting: same scene bank in the browser fallback
```

## 16. Backend + frontend redeploy: unique interviews, context, pasted plans (2026-10-12 ~02:50 local)

```bash
cd wanderlust-index
npx ampx sandbox --once      # Lambda: random theme/twist per scene, client context + CloudFront viewer-country header,
                             # reads pasted itinerary first, strips location/plans from responses
./scripts/deploy.sh          # Amplify Hosting: "Already have plans?" + opt-in "Use my location" on the setup screen
```

## 17. Backend redeploy: faster fallback (2026-10-12 ~02:55 local)

```bash
cd wanderlust-index && npx ampx sandbox --once
```
Interview LLM time budget cut from 14 s to 10 s so a failing provider drops to the offline scene bank sooner.

## 18. New OpenRouter key + free NVIDIA Nemotron models (2026-10-12 ~03:15 local)

```bash
cd wanderlust-index
# Key check (OpenRouter API, not AWS): free tier, no credits → paid models 402, ':free' models allowed
printf '%s' '<REDACTED>' | npx ampx sandbox secret set LLM_API_KEY      # SSM SecureString, version 2
npx ampx sandbox --once      # LLM_MODELS = nemotron-3-super / nemotron-3-ultra / nemotron-3.5-lightning (:free),
                             # reasoning disabled, predict split into stage=rank + write-up (each < 30 s AppSync limit)
./scripts/deploy.sh          # frontend: two-step prediction, scene prefetch off to save free-tier quota
```
Local end-to-end test: interview scenes 2–3 s each; rank 4.5 s; write-up 10 s (Jambiani, Zanzibar, fitted around pasted plans).

## 19. Diagnosing the live fallback via CloudWatch Logs (2026-10-12 ~03:37 local)

```bash
FN=$(aws lambda list-functions --region us-east-1 \
  --query "Functions[?contains(FunctionName,'travelagent')].FunctionName" --output text)
aws logs filter-log-events --region us-east-1 --log-group-name "/aws/lambda/$FN" \
  --start-time $(( ($(date +%s) - 600) * 1000 )) \
  --filter-pattern '?WARN ?failed ?Shortlist ?Write ?Task' --query 'events[].message' --output text
```
Finding: OpenRouter returned `429 Rate limit exceeded: free-models-per-day` (≈50 free requests/day on an account with no credits)
for all three Nemotron models; the Lambda fell back to the atlas engine as designed. Nova Canvas still throttled (Bedrock quota 0).

## 20. Groq as primary LLM, OpenRouter as backup (2026-10-12 ~03:55 local)

```bash
cd wanderlust-index
# Move the OpenRouter key to a backup secret (copied SSM → SSM, never printed), then store the Groq key as primary
PNAME=$(aws ssm describe-parameters --region us-east-1 --query "Parameters[?ends_with(Name,'/LLM_API_KEY')].Name" --output text)
aws ssm get-parameter --region us-east-1 --name "$PNAME" --with-decryption --query Parameter.Value --output text \
  | tr -d '\n' | npx ampx sandbox secret set LLM2_API_KEY
printf '%s' '<REDACTED GROQ KEY>' | npx ampx sandbox secret set LLM_API_KEY
npx ampx sandbox --once
```
Lambda provider chain: Groq (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, reasoning_effort=low)
→ OpenRouter free Nemotron → offline atlas engine. Lower max_tokens per call to fit Groq's free tokens-per-minute cap.
Local test: Groq scenes 1.3–1.5 s each.

## 21. Live verification of the deployed Lambda with Groq (2026-10-12 ~03:50 local)

```bash
FN=$(aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName,'travelagent')].FunctionName" --output text)
# Same event shape AppSync's generated resolver sends ({ fieldName, arguments, request.headers })
aws lambda invoke --function-name $FN --region us-east-1 --cli-binary-format raw-in-base64-out \
  --payload file://wl-rank.json wl-rank-out.json      # predict, stage=rank
aws lambda invoke --function-name $FN --region us-east-1 --cli-binary-format raw-in-base64-out \
  --payload file://wl-write.json wl-write-out.json    # predict, ranking + chosen → write-up
```
Result: rank 4.6 s (5 real candidates, distance/budget penalties applied), write-up 4.2 s by `openai/gpt-oss-120b`
on Groq → Lake Bunyonyi (Kigufi), Uganda, quoting the user's answers.

## 22. Frontend deploy: redesigned landing page (2026-10-12 ~04:30 local)

```bash
cd wanderlust-index && ./scripts/deploy.sh
```
New landing: playable first scene in the hero, a real result from the deployed agent with scores and penalty notes,
plain-prose "How it decides", "What it doesn't do". Removed the pill eyebrow, gradient text, marquee, icon-card grid and parallax.

## 23. Frontend deploy: real place photos (2026-10-12 ~18:15 UTC)

```bash
cd wanderlust-index && ./scripts/deploy.sh
```
Added 7 openly licensed Wikimedia Commons photos (WebP, 35–260 KB) served from Amplify Hosting under /places/,
a live Commons photo lookup for the reveal postcard (browser → commons.wikimedia.org API), and a photo credits list.

## 24. Frontend deploy: photos across the app (2026-10-12 ~18:30 UTC)

```bash
cd wanderlust-index && ./scripts/deploy.sh
```
Hero background photo (slow zoom), per-scene interview photos (crossfade + slide), drifting photo band on setup,
photo slideshow behind the loading globe; 11 more Wikimedia Commons photos in /scenes. Tested locally in the browser first.

## 25. Backend + frontend redeploy: honest quotes and better photo search (2026-10-12 ~18:40 UTC)

```bash
cd wanderlust-index
npx ampx sandbox --once      # write-up prompt: never invent quotes when the interview is empty ("Pick a place for me")
./scripts/deploy.sh          # Commons photo lookup also tries the name without generic words (Village, Old Town, ...)
```
