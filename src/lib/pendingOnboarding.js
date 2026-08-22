// The Google onboarding handoff, held in memory for exactly one navigation.
//
// WHAT THIS CLOSES. app/(auth)/finish-setup.jsx read onboardingToken, email and
// name straight off useLocalSearchParams(). Its only guard was that a token was
// present. So anyone who could get a person to open a
// towinly://finish-setup?onboardingToken=...&email=...&name=... link decided
// what that screen said about who they were, and decided which token the screen
// then POSTed to /auth/oauth/complete to log the device in.
//
// The defence already existed next door and this screen did not have it.
// app/(auth)/oauth-callback.jsx refuses any deep link it did not start, by
// matching `state` against a pending flow and sending the PKCE verifier
// (src/lib/oauthFlow.js). This file closes the same door on the screen that
// callback hands off to: nothing arrives through the URL any more.
//
// IN MEMORY ON PURPOSE, not storage. The two screens are one navigation apart
// inside one JS session, so memory is all the flow needs, and a value that
// never touches disk cannot be planted by a link, cannot survive a cold start,
// and cannot outlive the attempt. A deep link straight to finish-setup starts a
// session with nothing pending, which is the refusal. src/lib/oauthFlow.js uses
// SecureStore because ITS values must survive the app being backgrounded while
// the person is over in a browser; this handoff never leaves the app.
let pending = null;

/**
 * Record the flow oauth-callback just completed. Called with the exchange
 * response, never with anything read off a URL.
 */
export function setPendingOnboarding({ onboardingToken, email, name } = {}) {
  if (!onboardingToken) {
    pending = null;
    return null;
  }
  pending = { onboardingToken, email: email ?? '', name: name ?? '' };
  return pending;
}

/**
 * The pending record, or null when this app started no such flow.
 * Reading does NOT clear it: the screen renders from it and then submits with
 * it, which is two reads of one flow.
 */
export function getPendingOnboarding() {
  return pending;
}

/** Called when the flow ends. Success clears it; a failure leaves it to retry. */
export function clearPendingOnboarding() {
  pending = null;
}
