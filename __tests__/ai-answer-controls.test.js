// "Read aloud" and "Report this answer" sit side by side under every AI answer,
// inside a bubble capped at 85% of the list width. Measured in a real browser at
// 320pt (iPhone SE, the narrowest phone this app supports), that row overflowed
// its bubble and both controls were 14pt tall, which is 42pt even with the
// native hitSlop. Below the 44pt floor, on an elder-first product, on the one
// control Google Play requires for AI-generated content.
//
// These tests pin the layout contract so it cannot regress: the row wraps rather
// than overflowing, and each control is 44pt tall on its own, without relying on
// hitSlop (which React Native Web ignores entirely, so the phone web build had
// 14pt targets in fact, not just in theory).
// See docs/audit/2026-08-07-presubmission-audit.md finding B5.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { AuthProvider } from '../src/context/AuthContext';
import AskAiAssistant from '../src/components/AskAiAssistant';

const MIN_TARGET = 44;

jest.mock('expo-router', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

// Consent is a separate concern with its own tests; granted here so the send
// goes straight through to an answer.
jest.mock('../src/lib/aiConsent', () => ({
  hasAiConsent: jest.fn(async () => true),
  grantAiConsent: jest.fn(async () => {}),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({
      data: {
        reply:
          'Trust on Towinly is a seven step ladder. You climb it together by meeting, '
          + 'helping and checking in, and each step has to be earned by both people.',
      },
    })),
    get: jest.fn(async () => ({ data: [] })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

const wrap = () =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AskAiAssistant />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/** Opens the helper, asks a question, and waits for the answer to land. */
async function askAQuestion() {
  const view = await wrap();
  await act(async () => {
    fireEvent.press(view.getByLabelText('Ask AI, your Towinly helper'));
  });
  await act(async () => {
    fireEvent.changeText(view.getByLabelText('Your question'), 'How does trust work?');
  });
  await act(async () => {
    fireEvent.press(view.getByLabelText('Send question'));
  });
  return view;
}

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

// One test, one render. Rendering the whole helper is expensive (Modal,
// FlatList, four providers): four separate renders pushed the full suite from
// 17s to 130s and timed out unrelated suites.
describe('the controls under every AI answer', () => {
  test('both clear 44pt on their own, and the row wraps instead of overflowing', async () => {
    // Arrange / Act
    const { getByLabelText, getByTestId } = await askAQuestion();
    const controls = ['Read this answer aloud', 'Report this answer'].map((label) => ({
      label,
      style: styleOf(getByLabelText(label)),
    }));
    const row = styleOf(getByTestId('ai-answer-actions'));

    // Assert - a real box, not hitSlop. React Native Web drops hitSlop, so a
    // target that only exists as slop does not exist on the phone web build.
    expect(controls).toHaveLength(2);
    for (const { label, style } of controls) {
      expect({ label, minHeight: style.minHeight }).toEqual({
        label,
        minHeight: expect.any(Number),
      });
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(style.justifyContent).toBe('center');
    }

    // At 320pt the two labels are wider than the 85% bubble allows, and RN never
    // shrinks a row child, so nowrap meant visible overflow past the padding.
    expect(row.flexDirection).toBe('row');
    expect(row.flexWrap).toBe('wrap');
    // Wrapped lines need their own gap or the two rows touch.
    expect(row.rowGap).toBeGreaterThan(0);
  }, 30_000);
});
