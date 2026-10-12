#!/usr/bin/env bash
# Builds the frontend and publishes it to Amplify Hosting (manual deploy, no git connection needed).
set -euo pipefail
APP_ID=d23rqcp8t8jrja
BRANCH=main
REGION=us-east-1
npm run build
rm -f /tmp/wl-dist.zip && (cd dist && zip -qr /tmp/wl-dist.zip .)
read -r JOB URL < <(aws amplify create-deployment --app-id $APP_ID --branch-name $BRANCH --region $REGION --query '[jobId,zipUploadUrl]' --output text)
curl -sf -X PUT -H 'Content-Type: application/zip' --upload-file /tmp/wl-dist.zip "$URL"
aws amplify start-deployment --app-id $APP_ID --branch-name $BRANCH --job-id "$JOB" --region $REGION --query 'jobSummary.status' --output text
for _ in $(seq 1 30); do
  S=$(aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id "$JOB" --region $REGION --query 'job.summary.status' --output text)
  [[ $S == SUCCEED || $S == FAILED ]] && break; sleep 4
done
echo "Deploy $S → https://$BRANCH.$APP_ID.amplifyapp.com"
