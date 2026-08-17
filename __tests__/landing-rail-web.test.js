// Landing journey rail: the tortoise, dots, and 0N/07 counter must follow
// the pager on EVERY platform, each by its own signal. Native emits momentum
// events, and the counter waits for them: it ticks once per ARRIVED page,
// because scroll-driven Math.round flipped the number at the half-way point
// of a drag and could jitter around the boundary (owner bug report,
// 2026-08-16). react-native-web never fires momentum events (ScrollViewBase
// only dispatches onScroll), so the web keeps advancing from plain scroll,
// the fix for the rail frozen on 01/07 at towinly.com/app/landing.
import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';
import Landing from '../app/(auth)/landing';
import { ThemeProvider } from '../src/theme/ThemeContext';

// The official reanimated mock (jest.setup.js) has no useReducedMotion,
// which the intro lockup on slide 1 reads. Pin it on: animations snap.
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));

jest.mock('../src/lib/onboarding', () => ({
  markOnboarded: jest.fn(() => Promise.resolve()),
}));

// Mirrors the screen: slideH = window height - (insets.top + 44), and the
// safe-area mock in jest.setup.js pins insets to zero.
const TOP_BAR = 44;
const slideH = Dimensions.get('window').height - TOP_BAR;

async function renderLanding() {
  const r = await render(
    <ThemeProvider>
      <Landing />
    </ThemeProvider>
  );
  return { ...r, pager: r.getByTestId('landing-pager') };
}

test('the rail starts at chapter one', async () => {
  const r = await renderLanding();
  expect(r.getByText('01/07')).toBeTruthy();
});

test('web: a plain scroll advances the rail (no momentum events exist there)', async () => {
  Platform.OS = 'web';
  try {
    const r = await renderLanding();
    await fireEvent.scroll(r.pager, { nativeEvent: { contentOffset: { y: slideH } } });
    expect(r.getByText('02/07')).toBeTruthy();
  } finally {
    Platform.OS = 'ios';
  }
});

test('native: a mid-drag scroll leaves the counter alone until the page settles', async () => {
  // The bug this pins: the number used to flip at the half-way point of a
  // drag and could jitter when a slow drag hovered near the boundary.
  const r = await renderLanding();
  await fireEvent.scroll(r.pager, { nativeEvent: { contentOffset: { y: slideH } } });
  expect(r.getByText('01/07')).toBeTruthy();
  await fireEvent(r.pager, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { y: slideH } },
  });
  expect(r.getByText('02/07')).toBeTruthy();
});

test('a momentum settle advances the rail (native pager)', async () => {
  const r = await renderLanding();
  await fireEvent(r.pager, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { y: slideH * 2 } },
  });
  expect(r.getByText('03/07')).toBeTruthy();
});
