// DEEP-08, the last three controls whose 44pt promise was made of hitSlop.
//
// react-native-web's Pressable never reads hitSlop, so at towinly.com/app/ the
// BOX is the target. These three mattered most of the ones left:
//
//   landing.jsx  Skip and Log in, about 38pt: the only two ways out of the
//                seven-chapter story, on the first screen a new person sees
//   game.jsx     Skip to Home, about 40pt
//
// Every assertion measures the RENDERED box. A control propped up by hitSlop
// passes a "can I press it" test and is still a 38pt target in a browser, so
// pressing is not what is checked here. Same contract as targets-shared.test.js.
import { render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import Landing from '../app/(auth)/landing';
import Game from '../app/game';
import { ThemeProvider } from '../src/theme/ThemeContext';

const MIN_TARGET = 44; // design law: a real box, because web has no hitSlop

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/lib/onboarding', () => ({ markOnboarded: jest.fn(() => Promise.resolve()) }));

/** The flattened style a Pressable actually renders with, pressed state resolved. */
function boxOf(el) {
  const s = el.props.style;
  return StyleSheet.flatten(typeof s === 'function' ? s({ pressed: false }) : s) || {};
}

describe('the two ways out of the landing story', () => {
  test.each(['Skip the story and sign up', 'Log in'])('%s is a real 44pt box', async (label) => {
    const r = await render(
      <ThemeProvider>
        <Landing />
      </ThemeProvider>
    );
    const el = await waitFor(() => r.getByLabelText(label));
    const box = boxOf(el);

    // The measurement, not the slop: hitSlop is ignored on purpose here.
    expect(box.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('Peekaboo', () => {
  test('Skip to Home is a real 44pt box', async () => {
    const r = await render(
      <ThemeProvider>
        <Game />
      </ThemeProvider>
    );
    const el = await waitFor(() => r.getByLabelText('Skip to Home'));
    expect(boxOf(el).minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});
