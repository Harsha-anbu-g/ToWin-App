// Mirrors ToWin/frontend/src/context/ThemeContext.jsx: light is the ONLY default,
// night mode is strictly opt-in (Profile toggle), persisted under "towin-theme",
// and the OS appearance is never followed (elder predictability).
import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { light, dark, spacing, radius, text, fontFamily } from './tokens';

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

  const toggle = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    try {
      await SecureStore.setItemAsync(KEY, next);
    } catch {
      // persistence failed — the in-memory theme still applies this session
    }
  };

  const t = mode === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ mode, toggle, t, spacing, radius, text, fontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
