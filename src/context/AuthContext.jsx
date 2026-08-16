// Mirrors Towinly/frontend/src/context/AuthContext.jsx for mobile.
// Only the token is persisted (src/lib/storage — the phone keychain, encrypted;
// localStorage in the browser build, which is NOT encrypted); role, userId and
// emailVerified are ALWAYS derived from the signed JWT — never from writable
// storage. An expired token at boot is treated as logged out from the start,
// so pages never render broken and silently empty. Absent `ev` claim
// (old/grandfathered tokens) = verified.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Store from '../lib/storage';
import { setOnSessionExpired, setTokenGetter } from '../api/client';
import { clearDrafts } from '../lib/chatDrafts';
import { unregisterPushAsync } from '../lib/pushNotifications';
import { parseJwtPayload } from '../lib/jwt';
import { KEYS } from '../lib/storageKeys';
import {
  clearWebsiteToken,
  readWebsiteToken,
  subscribeSessionChanges,
  writeWebsiteToken,
} from '../lib/webSession';

const KEY = KEYS.authToken;
const AuthContext = createContext(null);

export function userFromToken(token) {
  const payload = parseJwtPayload(token);
  if (!payload) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return {
    token,
    role: payload.role,
    userId: payload.sub,
    emailVerified: payload.ev !== false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false); // don't route until restore finishes
  // Set when a 401 bounced the user out (expired session) — Login explains why
  // they're back there instead of leaving them guessing (web: sessionStorage flag).
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef(null);
  userRef.current = user;
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    // Silence this phone for the account that is leaving. The DELETE needs no
    // session (holding the push token is the proof), so this works for an
    // expired session too. Fire-and-forget: sign-out never waits on it, and a
    // failed goodbye is retried by PushRegistrar on the next signed-out boot.
    unregisterPushAsync();
    setUser(null);
    // The next account on this phone must not see this account's cached
    // private data (chats, connections, profile) — wipe the query cache and
    // any unsent chat drafts.
    queryClient.clear();
    clearDrafts();
    // Web build only: the website shares this origin, so leaving its token
    // behind would keep a shared phone signed in on towinly.com after the
    // person pressed "Log out" here. Cleared FIRST, and outside the try, so a
    // failure to reach the app's own store can never skip it.
    clearWebsiteToken();
    try {
      await Store.deleteItemAsync(KEY);
    } catch {
      // storage unavailable — in-memory logout still holds for this session
    }
  }, [queryClient]);

  const login = useCallback(async (token) => {
    const next = userFromToken(token);
    if (!next) return false;
    setSessionExpired(false);
    setUser(next);
    // Web build only: one sign-in, one session — the marketing pages of the
    // same site should not greet a signed-in person as a stranger.
    writeWebsiteToken(token);
    try {
      await Store.setItemAsync(KEY, token);
    } catch {
      // not persisted — user stays logged in for this session only
    }
    return true;
  }, []);

  useEffect(() => {
    setTokenGetter(() => userRef.current?.token ?? null);
    setOnSessionExpired(() => {
      setSessionExpired(true);
      logout();
    });
    (async () => {
      try {
        const stored = await Store.getItemAsync(KEY);
        if (stored) {
          const restored = userFromToken(stored);
          if (restored) setUser(restored);
          else await Store.deleteItemAsync(KEY);
        } else {
          // Web build only: someone who signed in on the website and then
          // opened the app half of the same site is already signed in. An
          // expired one is ignored rather than deleted — that token belongs to
          // the website and it clears its own.
          const adopted = readWebsiteToken();
          if (adopted && userFromToken(adopted)) await login(adopted);
        }
      } catch {
        // unreadable storage — start logged out
      }
      setBooted(true);
    })();
  }, [logout, login]);

  // Web build only: another tab — the website itself, or a second app tab —
  // signing in or out must take this one with it. The browser never fires
  // `storage` in the tab that wrote, so this can't loop.
  useEffect(
    () =>
      subscribeSessionChanges((token) => {
        if (!token) {
          if (userRef.current) logout();
          return;
        }
        if (token === userRef.current?.token) return;
        login(token);
      }),
    [login, logout]
  );

  // Stable value — useAuth() consumers span the whole app; don't re-render them
  // all just because the provider re-rendered.
  const value = useMemo(
    () => ({ user, booted, login, logout, sessionExpired }),
    [user, booted, login, logout, sessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
