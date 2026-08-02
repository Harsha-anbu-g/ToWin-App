// Mirrors Towinly/frontend/src/context/ThemeContext.jsx: light is the ONLY default,
// night mode is strictly opt-in (Profile toggle), and the OS appearance is never
// followed (elder predictability).
//
// The preference lives under KEYS.theme ('towinly-app-theme'). It used to live
// under 'towin-theme' — which is also the WEBSITE's legacy theme key. On the web
// build both products share one localStorage, so writing that key from a phone
// flipped the desktop site to night mode. We now read it once as a fallback (so
// a returning visitor keeps their choice) and never write it again.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Store from '../lib/storage';
import { KEYS } from '../lib/storageKeys';
import { light, dark, spacing, radius, text, type, fontFamily } from './tokens';

const ThemeContext = createContext(null);
const KEY = KEYS.theme;
const LEGACY_KEY = KEYS.themeLegacyReadOnly;

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = (await Store.getItemAsync(KEY)) ?? (await Store.getItemAsync(LEGACY_KEY));
        if (saved === 'dark') setMode('dark');
      } catch {
        // unreadable preference — stay on the light default
      }
    })();
  }, []);

  const toggle = useCallback(async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    try {
      await Store.setItemAsync(KEY, next);
    } catch {
      // persistence failed — the in-memory theme still applies this session
    }
  }, [mode]);

  // Stable value: useTheme() is consumed by nearly every component, so a fresh
  // object here would re-render the whole tree on every provider render.
  const value = useMemo(
    () => ({ mode, toggle, t: mode === 'dark' ? dark : light, spacing, radius, text, type, fontFamily }),
    [mode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
