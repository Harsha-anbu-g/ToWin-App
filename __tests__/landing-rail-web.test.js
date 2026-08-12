// Landing journey rail: the tortoise, dots, and 0N/07 counter must follow
// the pager on EVERY platform. Native emits momentum events, so
// onMomentumScrollEnd is enough there — but react-native-web never fires
// momentum events (ScrollViewBase only dispatches onScroll), so the phone
// web build at towinly.com/app/landing froze the rail on 01/07 while the
// slides scrolled underneath. The rail must also advance from plain scroll
// events, which both platforms deliver.
import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
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

test('a plain scroll advances the rail (the web pager has no momentum events)', async () => {
  const r = await renderLanding();
  await fireEvent.scroll(r.pager, { nativeEvent: { contentOffset: { y: slideH } } });
  expect(r.getByText('02/07')).toBeTruthy();
});

test('a momentum settle advances the rail (native pager)', async () => {
  const r = await renderLanding();
  await fireEvent(r.pager, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { y: slideH * 2 } },
  });
  expect(r.getByText('03/07')).toBeTruthy();
});
