// The font gate used to render literally nothing while the serif loaded. On a
// phone the native splash hides that; in a browser it is a blank white page,
// which reads as a broken site.
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';

let mockFontState = [false, null];
jest.mock('@expo-google-fonts/newsreader', () => ({
  useFonts: () => mockFontState,
  Newsreader_400Regular: 'Newsreader_400Regular',
  Newsreader_400Regular_Italic: 'Newsreader_400Regular_Italic',
}));

const FontGate = require('../src/components/FontGate').default;
const { FONT_TIMEOUT_MS } = require('../src/components/FontGate');

const wrap = () =>
  render(
    <ThemeProvider>
      <FontGate>
        <Text>the app</Text>
      </FontGate>
    </ThemeProvider>
  );

beforeEach(() => {
  mockFontState = [false, null];
});

test('shows a placeholder — not a blank page — while the serif loads', async () => {
  const { queryByText, getByLabelText } = await wrap();
  expect(queryByText('the app')).toBeNull();
  expect(getByLabelText('Loading Towinly')).toBeTruthy();
});

test('the placeholder is wordless, so nothing flashes in a fallback face', async () => {
  const { queryAllByText } = await wrap();
  // Screen readers are told in words via accessibilityLabel; nothing is drawn.
  expect(queryAllByText(/./)).toHaveLength(0);
});

test('renders the app once the serif is ready', async () => {
  mockFontState = [true, null];
  const { getByText } = await wrap();
  expect(getByText('the app')).toBeTruthy();
});

test('renders the app in the fallback face when the fonts fail', async () => {
  mockFontState = [false, new Error('font CDN unreachable')];
  const { getByText } = await wrap();
  expect(getByText('the app')).toBeTruthy();
});

test('renders anyway after the timeout, so a slow CDN never freezes the app', async () => {
  jest.useFakeTimers();
  try {
    const { queryByText, findByText } = await wrap();
    expect(queryByText('the app')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(FONT_TIMEOUT_MS);
    });

    expect(await findByText('the app')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test('the timeout is short enough not to read as frozen', () => {
  expect(FONT_TIMEOUT_MS).toBeLessThanOrEqual(3000);
});
