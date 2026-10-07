// The translation layer itself: lookup, fallback, placeholders, switching.
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  __setLanguageForTests,
  currentLanguage,
  dateLocale,
  deviceLanguage,
  translate,
  tr,
  useLanguage,
} from '../src/i18n';
import emphasize from '../src/i18n/emphasize';

afterEach(() => __setLanguageForTests('en'));

test('English passes through untouched', () => {
  expect(tr('Log out')).toBe('Log out');
});

test('a known sentence comes back in the chosen language', () => {
  expect(translate('Log out', undefined, 'fr')).toBe('Se déconnecter');
  expect(translate('Log out', undefined, 'ta')).toBe('வெளியேறு');
});

test('an unknown sentence falls back to English, never to a blank or a key', () => {
  expect(translate('A sentence nobody translated', undefined, 'fr')).toBe('A sentence nobody translated');
});

test('placeholders are filled in every language, wherever the translation puts them', () => {
  expect(translate('Message {firstName}', { firstName: 'Nina' }, 'en')).toBe('Message Nina');
  expect(translate('Message {firstName}', { firstName: 'Nina' }, 'fr')).toBe('Écrire à Nina');
  expect(translate('Message {firstName}', { firstName: 'Nina' }, 'ta')).toBe('Nina-க்குச் செய்தி அனுப்பு');
});

test('a placeholder with no value is left visible rather than dropped', () => {
  expect(translate('Message {firstName}', {}, 'en')).toBe('Message {firstName}');
});

test('an empty translation is honoured, not mistaken for a missing one', () => {
  expect(translate('old', undefined, 'fr')).toBe('');
});

test('dates follow the chosen language, and English keeps the phone or the screen locale', () => {
  expect(dateLocale()).toBeUndefined();
  expect(dateLocale('en-GB')).toBe('en-GB');
  __setLanguageForTests('fr');
  expect(dateLocale('en-GB')).toBe('fr-CA');
  __setLanguageForTests('ta');
  expect(dateLocale()).toBe('ta-IN');
});

test('the phone language is one the app speaks, or English', () => {
  expect(['en', 'fr', 'ta']).toContain(deviceLanguage());
});

test('switching language re-renders anyone listening', async () => {
  function Probe() {
    useLanguage();
    return <Text>{tr('Log out')}</Text>;
  }
  await render(<Probe />);
  expect(screen.getByText('Log out')).toBeTruthy();
  await act(async () => __setLanguageForTests('fr'));
  expect(currentLanguage()).toBe('fr');
  expect(screen.getByText('Se déconnecter')).toBeTruthy();
});

test('emphasize keeps one sentence and styles the marked part, wherever it lands', () => {
  __setLanguageForTests('fr');
  const parts = emphasize(tr('How *trust* grows'), { color: 'gold' });
  expect(parts[0]).toBe('Comment grandit la ');
  expect(parts[1].props.children).toBe('confiance');
  expect(parts[1].props.style).toEqual({ color: 'gold' });
});
