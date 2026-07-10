// Mirrors ToWin/frontend/src/context/AuthContext.jsx for mobile.
// Only the token is persisted (SecureStore, encrypted); role, userId and
// emailVerified are ALWAYS derived from the signed JWT — never from writable
// storage. An expired token at boot is treated as logged out from the start,
// so pages never render broken and silently empty. Absent `ev` claim
// (old/grandfathered tokens) = verified.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setOnSessionExpired, setTokenGetter } from '../api/client';
import { parseJwtPayload } from '../lib/jwt';

const KEY = 'towin-token';
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
  const userRef = useRef(null);
  userRef.current = user;

  const logout = useCallback(async () => {
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // storage unavailable — in-memory logout still holds for this session
    }
  }, []);

  const login = useCallback(async (token) => {
    const next = userFromToken(token);
    if (!next) return false;
    setUser(next);
    try {
      await SecureStore.setItemAsync(KEY, token);
    } catch {
      // not persisted — user stays logged in for this session only
    }
    return true;
  }, []);

  useEffect(() => {
    setTokenGetter(() => userRef.current?.token ?? null);
    setOnSessionExpired(() => {
      logout();
    });
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(KEY);
        if (stored) {
          const restored = userFromToken(stored);
          if (restored) setUser(restored);
          else await SecureStore.deleteItemAsync(KEY);
        }
      } catch {
        // unreadable storage — start logged out
      }
      setBooted(true);
    })();
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, booted, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
