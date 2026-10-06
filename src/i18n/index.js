// English, French and Tamil, without a library.
//
// The English sentence IS the key: screens call tr('Post a request') and the
// French dictionary maps that exact sentence to its translation. A sentence the
// dictionary does not know comes back in English, so a missed string is never a
// blank or a raw key on an elder's screen, only an untranslated line.
//
// Placeholders are named and written the same in both languages:
//   tr('Hello, {name}', { name }) → 'Bonjour, {name}' → 'Bonjour, Margaret'
//
// The chosen language lives in one module-level variable, so tr() works in
// screens, hooks and plain helper files alike. ThemeProvider subscribes to it
// (see src/theme/ThemeContext.jsx), and nearly every component reads the theme,
// so switching language repaints the app without a restart.
import { useSyncExternalStore } from 'react';
import { KEYS } from '../lib/storageKeys';
import fr from './fr';
import ta from './ta';

// Required on first use, not at import: jest.setup.js loads this module before
// the native mocks exist, and only the saved-choice paths touch storage.
const store = () => require('../lib/storage');

/** The languages the app offers, each named in its own language. */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ta', label: 'தமிழ்' },
];

const DICTIONARIES = { fr, ta };
const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));

let current = deviceLanguage();
const listeners = new Set();

/** The phone's own language when the app speaks it, English otherwise. */
export function deviceLanguage() {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
    if (locale.startsWith('fr')) return 'fr';
    if (locale.startsWith('ta')) return 'ta';
    return 'en';
  } catch {
    return 'en';
  }
}

/**
 * The sentence in the given language, placeholders filled.
 * @param {string} text the English sentence
 * @param {Record<string, string|number>} [vars]
 * @param {string} [lang]
 */
export function translate(text, vars, lang = current) {
  if (typeof text !== 'string') return text;
  const dict = DICTIONARIES[lang];
  let out = (dict && dict[text]) || text;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (whole, name) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
    );
  }
  return out;
}

/** The sentence in the current language. */
export const tr = (text, vars) => translate(text, vars);

/**
 * The locale to format dates and numbers in: the phone's own for English
 * (or `englishLocale` when a screen pins one), and the chosen language otherwise,
 * so a French screen never shows "July 17".
 */
export function dateLocale(englishLocale) {
  if (current === 'fr') return 'fr-CA';
  if (current === 'ta') return 'ta-IN';
  return englishLocale;
}

/** 'en', 'fr' or 'ta'. */
export function currentLanguage() {
  return current;
}

/** Switches the whole app and remembers the choice on this device. */
export function setLanguage(lang) {
  if (!SUPPORTED.has(lang) || lang === current) return;
  current = lang;
  listeners.forEach((listener) => listener());
  store().setItemAsync(KEYS.language, lang).catch(() => {
    // Storage unavailable: the choice holds for this session only.
  });
}

/** Applies a choice saved earlier on this device, if there is one. */
export async function loadLanguagePreference() {
  try {
    const saved = await store().getItemAsync(KEYS.language);
    if (SUPPORTED.has(saved) && saved !== current) {
      current = saved;
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Nothing saved, or storage unavailable: keep the phone's own language.
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current language, re-rendering the caller when it changes. */
export function useLanguage() {
  return useSyncExternalStore(subscribe, currentLanguage, currentLanguage);
}

/** Test seam: force a language without touching storage. */
export function __setLanguageForTests(lang) {
  current = SUPPORTED.has(lang) ? lang : 'en';
  listeners.forEach((listener) => listener());
}
