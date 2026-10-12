import { defineAuth } from '@aws-amplify/backend';

// Email login exists only so the identity pool can issue guest credentials;
// the app itself is used anonymously.
export const auth = defineAuth({
  loginWith: { email: true },
});
