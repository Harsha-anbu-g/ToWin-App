// Mirrors ToWin/frontend/src/context/ThemeContext.jsx: light is the ONLY default,
// night mode is strictly opt-in (Profile toggle), persisted under "towin-theme",
// and the OS appearance is never followed (elder predictability).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { light, dark, spacing, radius, text, type, fontFamily } from './tokens';

const ThemeContext = createContext(null);
const KEY = 'towin-theme';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY);
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
      await SecureStore.setItemAsync(KEY, next);
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
