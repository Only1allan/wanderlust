import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { travelAgent } from './functions/travel-agent/resource';

const backend = defineBackend({ auth, data, travelAgent });

backend.travelAgent.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/amazon.nova-canvas-v1:0'],
  }),
);
