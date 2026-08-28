// UX-707 — safe areas and headers: no content under the notch, every back
// control 44px, one header treatment everywhere.
//
// The unified header bar (website NavBar + chat-thread header parity): page
// background, warm hairline underneath, Newsreader 400 title. The website's
// header is `var(--canvas)` = its PAGE colour with `1px solid var(--border)`;
// the app's page colour is t.surface, so headers here are t.surface + t.border.
//
// Same convention as keyboard-avoidance.test.js: render pins on the shared
// Screen header and the chat header (the treatment cannot silently drop out
// of the tree), plus source scans so a NEW screen cannot ship outside the
// safe areas and a mid-form screen cannot silently regain iOS swipe-back.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { light } from '../src/theme/tokens';
import api from '../src/api/client';
import Screen from '../src/components/ui/Screen';
import ChatThread from '../app/chat/[connectionId]';

let mockUser = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    booted: true,
    login: jest.fn(),
    sessionExpired: false,
  }),
}));

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readCode = (p) => fs.readFileSync(p, 'utf8');

function wrap(ui) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  mockUser = null;
  api.get.mockResolvedValue({ data: [] });
});

// ---------- render pins: the one header treatment ----------

test('Screen header: page background, hairline underneath, 44px labelled back, Newsreader 400 title', async () => {
  const r = await wrap(
    <Screen back title="Sample page">
      <Text>body</Text>
    </Screen>
  );

  const header = r.getByTestId('screen-header');
  const headerStyle = StyleSheet.flatten(header.props.style);
  expect(headerStyle.backgroundColor).toBe(light.surface);
  expect(headerStyle.borderBottomWidth).toBe(1);
  expect(headerStyle.borderBottomColor).toBe(light.border);

  const back = r.getByLabelText('Back');
  const backStyle = StyleSheet.flatten(
    typeof back.props.style === 'function' ? back.props.style({ pressed: false }) : back.props.style
  );
  expect(backStyle.minWidth).toBeGreaterThanOrEqual(44);
  expect(backStyle.minHeight).toBeGreaterThanOrEqual(44);

  const title = r.getByText('Sample page');
  const titleStyle = StyleSheet.flatten(title.props.style);
  expect(titleStyle.fontFamily).toBe('Newsreader_400Regular');
  expect(titleStyle.fontWeight).toBeUndefined(); // weight 400 only, never bolded
});

test('chat header: same page background and hairline, 44px labelled back', async () => {
  mockUser = { role: 'ELDER', userId: 'me', emailVerified: true };
  api.get.mockImplementation((url) => {
    if (url === '/connections')
      return Promise.resolve({
        data: [
          {
            id: 'c1',
            otherUserId: 'u1',
            otherUserName: 'Priya',
            otherUserRole: 'HELPER',
            type: 'HELP',
            status: 'ACTIVE',
            currentTrustLevel: 'MESSAGING',
            confirmedByMe: true,
            confirmedByOther: true,
            sharedWithFamily: false,
          },
        ],
      });
    if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: {} });
  });

  const r = await wrap(<ChatThread />);
  await waitFor(() => expect(r.getByTestId('chat-header')).toBeTruthy());

  const header = r.getByTestId('chat-header');
  const headerStyle = StyleSheet.flatten(header.props.style);
  // The website's chat header is its page colour + hairline (Messages.jsx:
  // background var(--canvas), borderBottom 1px var(--border)). t.canvas here
  // is the CARD parchment, not the page — the header must use the page colour.
  expect(headerStyle.backgroundColor).toBe(light.surface);
  expect(headerStyle.borderBottomWidth).toBe(1);
  expect(headerStyle.borderBottomColor).toBe(light.border);

  const back = r.getByLabelText('Back to messages');
  const backStyle = StyleSheet.flatten(
    typeof back.props.style === 'function' ? back.props.style({ pressed: false }) : back.props.style
  );
  expect(backStyle.minWidth).toBeGreaterThanOrEqual(44);
  expect(backStyle.minHeight).toBeGreaterThanOrEqual(44);

  // UX-714: the profile target beside it wraps a 38px avatar row — hitSlop
  // tops it up to 44 effective (38 + 3 + 3), the SegmentedControl pattern.
  // findBy: the label reads "Friend's profile" until /connections resolves.
  const profileTarget = await r.findByLabelText(/'s profile$/);
  expect(profileTarget.props.hitSlop).toEqual({ top: 3, bottom: 3 });
});

// ---------- source scans: coverage that survives new screens ----------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.jsx')) files.push(full);
  }
  return files;
}

test('every screen under app/ renders inside safe areas (Screen primitive, SafeAreaView, or insets)', () => {
  const screens = walk(path.join(ROOT, 'app')).filter(
    (f) => !f.endsWith('_layout.jsx')
  );
  const offenders = [];
  for (const file of screens) {
    const code = readCode(file);
    const handlesSafeArea =
      code.includes('<Screen') ||
      code.includes('SafeAreaView') ||
      code.includes('useSafeAreaInsets');
    // URL-parity aliases and auth gates render no chrome of their own.
    const isPureRedirect = code.includes('<Redirect') && !code.includes('<View');
    if (!handlesSafeArea && !isPureRedirect) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  expect(offenders).toEqual([]);
});

test('pinned footers clear the home-indicator zone (profile-edit joins the feedback pattern)', () => {
  for (const rel of ['app/profile-edit.jsx', 'app/feedback.jsx']) {
    const code = readCode(path.join(ROOT, rel));
    expect(code).toMatch(/Math\.max\(insets\.bottom/);
  }
});

// iOS swipe-back must be OFF exactly on the mid-form screens where a half
// swipe would eat typed text without warning, and ON everywhere else —
// chat included, because chat drafts survive leaving the thread.
const GESTURE_OFF_LEDGER = {
  'app/_layout.jsx': ['profile-edit', 'feedback', 'change-password', 'emergency-contacts', 'pass-on/index'],
  // register is the role question since 2026-08-28: three rows, nothing typed,
  // so it keeps the gesture; the form moved to create-account.
  'app/(auth)/_layout.jsx': ['create-account', 'finish-setup', 'reset-password'],
};

test('mid-form screens disable iOS swipe-back in their stack layout', () => {
  for (const [layout, routes] of Object.entries(GESTURE_OFF_LEDGER)) {
    const code = readCode(path.join(ROOT, layout));
    for (const route of routes) {
      const pin = new RegExp(
        `name="${route.replace('/', '\\/')}"[\\s\\S]{0,120}gestureEnabled:\\s*false`
      );
      expect(code).toMatch(pin);
    }
  }
});

test('chat keeps swipe-back: drafts make the gesture safe there', () => {
  const rootLayout = readCode(path.join(ROOT, 'app/_layout.jsx'));
  expect(rootLayout).not.toMatch(/name="chat[\s\S]{0,120}gestureEnabled:\s*false/);
});
