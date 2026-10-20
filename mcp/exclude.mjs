// Functions that only make sense on a phone or in a browser, each with its
// reason. catalog.mjs skips these; the coverage test asserts every other
// export is a tool. Plumbing files hold the axios client, not actions.
export const PLUMBING_FILES = new Set(['client.js', 'config.js']);

export const EXCLUDED = Object.freeze({
  logIn: 'the server signs in itself from TOWINLY_IDENTIFIER and TOWINLY_PASSWORD',
  registerPushToken: "registers a phone's push token; the server has no phone",
  unregisterPushToken: "removes a phone's push token",
  exchangeOAuthCode: 'second half of a Google sign-in that starts in a browser',
  completeOAuthSignup: 'finishes a Google sign-up; needs the browser flow above',
  submitIdPhoto: 'multipart photo upload from a phone camera',
  updateProfilePhoto: 'multipart photo from a phone picker',
  syncBlockedPeople: "one-time migration of a phone's old local block list",
});
