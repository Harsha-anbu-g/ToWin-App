// DEEP-40: the blueWash callout that opens Share Feedback is the screen's own
// reading text, so it renders at the body size like the equivalent NoteBox
// paragraph on the landing story (app/(auth)/landing.jsx). type.meta (13) is
// for chip labels and status lines, not a two-sentence paragraph an elder is
// asked to read. Lines 129 and 174 (a caption and a field label) stay meta.
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import Feedback from '../app/feedback';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { type } from '../src/theme/tokens';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );

test('the feedback callout paragraph reads at body size', async () => {
  // Arrange
  const r = await wrap(<Feedback />);

  // Act: the paragraph's tail sentence is a direct child of the styled Text.
  const paragraph = r.getByText(/shapes what gets built next/);

  // Assert: body token, not meta; line height opened up to match.
  const style = StyleSheet.flatten(paragraph.props.style);
  expect(style.fontSize).toBe(type.body);
  expect(style.lineHeight).toBe(22);
});

test('the caption and the rating label stay at meta size', async () => {
  // Arrange
  const r = await wrap(<Feedback />);

  // Act: the two lines DEEP-40 deliberately left alone (feedback.jsx:129, :174).
  const caption = r.getByText('All fields are optional except your message.');
  const ratingLabel = r.getByText('Rate the app (optional)');

  // Assert: secondary lines, so meta is right; this guards against a later
  // sweep raising every size on the screen because the callout moved.
  expect(StyleSheet.flatten(caption.props.style).fontSize).toBe(type.meta);
  expect(StyleSheet.flatten(ratingLabel.props.style).fontSize).toBe(type.meta);
});
