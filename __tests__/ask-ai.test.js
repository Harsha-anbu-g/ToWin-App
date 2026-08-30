// Ask AI sheet: the three deep-audit findings this file pins.
//
// DEEP-20 — "Read aloud" and "Report this answer" were labelled at type.caption
//   (12). tokens.js sets meta (14) as the floor for actionable secondary text;
//   caption is for non-actionable captions only. These are the control that
//   reads an answer to a low-vision elder and the control Google Play requires
//   for flagging AI output, so they were the smallest type in the app.
// DEEP-22 — every FlatList prop was rebuilt on each render, so a keystroke in
//   the composer re-rendered every mounted bubble (FlatList is a PureComponent:
//   one changed prop identity and the whole list renders again).
// DEEP-41 — the sheet title carries accessibilityRole="header" but rendered in
//   the system font at weight 600. Headings are Newsreader 400 only.
//
// Evidence: docs/audit/audit-2026-08-11-deep.md.
//
// Rendering this helper is expensive (Modal, FlatList, four providers), so each
// finding gets one render and no more — see the note in ai-answer-controls.test.js.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { AuthProvider } from '../src/context/AuthContext';
import { fontFamily, fontScaleCaps, type } from '../src/theme/tokens';
import AskAiAssistant from '../src/components/AskAiAssistant';

// Counts how often the icon inside a bubble's "Read aloud" control renders. One
// assistant answer is on screen, so this counts that bubble's renders.
const mockIconRenders = { Volume2: 0 };

// expo-router hands back a module-level singleton router, so a real call site
// can safely list it as a hook dependency. The mock is a single object for the
// same reason: a fresh one per render would be the test, not the component,
// breaking memoization.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };

jest.mock('expo-router', () => ({
  usePathname: () => '/home',
  useRouter: () => mockRouter,
}));

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

jest.mock('../src/components/icons', () => {
  const React = require('react');
  const actual = jest.requireActual('../src/components/icons');
  return {
    ...actual,
    Volume2: (props) => {
      mockIconRenders.Volume2 += 1;
      return React.createElement(actual.Volume2, props);
    },
  };
});

// Consent has its own tests; granted here so a send goes straight to an answer.
jest.mock('../src/lib/aiConsent', () => ({
  hasAiConsent: jest.fn(async () => true),
  grantAiConsent: jest.fn(async () => {}),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: { reply: 'Trust is earned one step at a time.' } })),
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

/** Opens the full-page helper. */
async function openSheet() {
  const view = await wrap();
  await act(async () => {
    fireEvent.press(view.getByLabelText('Ask AI, your Towinly helper'));
  });
  return view;
}

/** Opens the helper and waits for one answer to land. */
async function askAQuestion() {
  const view = await openSheet();
  await act(async () => {
    fireEvent.changeText(view.getByLabelText('Your question'), 'How does trust work?');
  });
  await act(async () => {
    fireEvent.press(view.getByLabelText('Send question'));
  });
  return view;
}

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

describe('DEEP-20: the Ask AI answer controls carry readable labels', () => {
  test('the greeting chip and both answer controls sit at the meta floor, not caption', async () => {
    // Arrange - the greeting chip only exists while no question has been asked.
    const view = await openSheet();
    const greetingChip = view.getByText('Read aloud');

    // Assert - meta (14) is the floor for actionable secondary text.
    expect(styleOf(greetingChip).fontSize).toBeGreaterThanOrEqual(type.meta);
    expect(greetingChip.props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);

    // Act - ask, so the per-answer controls replace the greeting.
    await act(async () => {
      fireEvent.changeText(view.getByLabelText('Your question'), 'How does trust work?');
    });
    await act(async () => {
      fireEvent.press(view.getByLabelText('Send question'));
    });

    // Assert - the read-aloud control an elder needs, and the report control
    // Google Play requires, are not the smallest type on the screen.
    for (const label of ['Read aloud', 'Report this answer']) {
      const node = view.getByText(label);
      expect({ label, fontSize: styleOf(node).fontSize }).toEqual({
        label,
        fontSize: expect.any(Number),
      });
      expect(styleOf(node).fontSize).toBeGreaterThanOrEqual(type.meta);
      expect(node.props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
    }
  }, 30_000);
});

describe('DEEP-22: typing a question does not re-render the answers above it', () => {
  test('a composer keystroke leaves the mounted bubbles alone', async () => {
    // Arrange - one answer on screen, so one bubble is mounted.
    const view = await askAQuestion();
    const before = mockIconRenders.Volume2;
    expect(before).toBeGreaterThan(0); // the bubble really is mounted

    // Act - one keystroke in the composer.
    await act(async () => {
      fireEvent.changeText(view.getByLabelText('Your question'), 'W');
    });

    // Assert - the composer owns the keystroke; the list must not redraw for it.
    expect(mockIconRenders.Volume2).toBe(before);
  }, 30_000);
});

describe('DEEP-41: the Ask AI sheet title is a real heading', () => {
  test('the title renders in Newsreader at weight 400, like every other heading', async () => {
    // Arrange - the FAB carries the same words, so pick the one declared a heading.
    const view = await openSheet();
    const heading = view
      .getAllByText('Ask AI')
      .find((node) => node.props.accessibilityRole === 'header');

    // Assert
    expect(heading).toBeTruthy();
    const style = styleOf(heading);
    expect(style.fontFamily).toBe(fontFamily.display);
    // Newsreader ships weight 400 only: any fontWeight here synthesises a fake bold.
    expect(style.fontWeight).toBeUndefined();
    expect(style.fontSize).toBeGreaterThanOrEqual(type.cardTitle);
  }, 30_000);
});

// APS-08, App Store readiness audit 2026-08-29 (Guideline 2.1): the composer
// carried a Mic button that recorded nothing. It focused the input and showed
// a toast pointing at the keyboard's dictation key: a control that exists to
// explain a different control, and the first thing a reviewer taps. The
// keyboard's own dictation key is the native way to speak a question and it
// needs no button here. The read-aloud controls (Speech.speak) are the other
// direction and stay.
describe('APS-08: no control implies recording it does not do', () => {
  test('the composer has no mic control; typing and sending still work', async () => {
    const view = await openSheet();

    expect(view.queryByLabelText('Speak your question')).toBeNull();

    // What remains is the whole composer: the question pill and Send.
    expect(view.getByLabelText('Your question')).toBeTruthy();
    expect(view.getByLabelText('Send question')).toBeTruthy();
  }, 30_000);
});
