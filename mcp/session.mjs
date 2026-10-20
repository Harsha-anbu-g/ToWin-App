// Holds the one token in memory, signs in from the environment on first use,
// and on a 401 signs in once more and retries that one call. Nothing is
// written to disk.
export class SessionError extends Error {
  isSessionError = true;
}

const NO_LOGIN = 'No Towinly login configured. Set TOWINLY_IDENTIFIER and TOWINLY_PASSWORD, or TOWINLY_TOKEN.';

/**
 * @param {object} deps
 * @param {object} deps.client  the bundle's `client` namespace (setTokenGetter, setOnSessionExpired)
 * @param {Function} deps.logIn the bundle's logIn
 * @param {object} [deps.env]   defaults to process.env
 */
export function createSession({ client, logIn, env = process.env }) {
  let token = env.TOWINLY_TOKEN || null;
  const canSignIn = Boolean(env.TOWINLY_IDENTIFIER && env.TOWINLY_PASSWORD);
  client.setTokenGetter(() => token);
  client.setOnSessionExpired(() => {
    token = null;
  });

  async function ensureSignedIn() {
    if (token) return;
    if (!canSignIn) throw new SessionError(NO_LOGIN);
    const res = await logIn({ identifier: env.TOWINLY_IDENTIFIER, password: env.TOWINLY_PASSWORD });
    if (!res?.token) throw new SessionError('Sign-in did not return a token.');
    token = res.token;
  }

  /** Run one api call signed in; on a 401, sign in again and retry it once. */
  async function run(fn) {
    await ensureSignedIn();
    try {
      return await fn();
    } catch (error) {
      if (error?.response?.status !== 401 || !canSignIn) throw error;
      token = null;
      await ensureSignedIn();
      return await fn();
    }
  }

  return {
    run,
    ensureSignedIn,
    get token() {
      return token;
    },
  };
}
