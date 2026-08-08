// UX-703 — every tap answers back: haptics and visible press states.
//
// The haptic layer answers real actions and stays quiet for noise: a light
// impact for a primary press, a tab change and a chat send; a warning for a
// destructive press; success/error stay with the toast layer, which already
// fires them once per task outcome. Separately, every Pressable the user can
// see must change while pressed. The repo's press language is an instant
// opacity dip (opacity-only, no movement), so the reduce-motion setting has
// nothing it needs to strip: the feedback is already gentle and never
// disappears.
//
// Two layers of guard, same convention as font-scaling.test.js: render pins
// on the Button primitive and the chat composer (the haptic cannot silently
// drop), and a source scan over the ui kit plus the tab shell's transitive
// import closure (a NEW bare Pressable cannot ship without press feedback).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import ChatThread from '../app/chat/[connectionId]';

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
    user: { role: 'ELDER', userId: 'me', emailVerified: true },
    booted: true,
  }),
}));

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

// ---------- render pins: the Button primitive answers back ----------

test('a primary press answers with the light impact', async () => {
  const onPress = jest.fn();
  const r = await wrap(<Button title="Save" variant="primary" onPress={onPress} />);
  await fireEvent.press(r.getByText('Save'));
  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a destructive press answers with the warning pattern', async () => {
  const onPress = jest.fn();
  const r = await wrap(<Button title="Remove" variant="destructive" onPress={onPress} />);
  await fireEvent.press(r.getByText('Remove'));
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(
    Haptics.NotificationFeedbackType.Warning
  );
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('quiet variants stay silent: a tap is not an outcome', async () => {
  const r = await wrap(
    <>
      <Button title="Cancel" variant="secondary" onPress={() => {}} />
      <Button title="Skip" variant="text" onPress={() => {}} />
    </>
  );
  await fireEvent.press(r.getByText('Cancel'));
  await fireEvent.press(r.getByText('Skip'));
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

test('a disabled primary gives no haptic (nothing happened)', async () => {
  const r = await wrap(<Button title="Save" variant="primary" disabled onPress={() => {}} />);
  await fireEvent.press(r.getByText('Save'));
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

// ---------- render pin: sending a chat message answers back ----------

test('chat send fires the light impact with the message', async () => {
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
  api.post.mockResolvedValue({ data: {} });

  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'Hello Priya');
  await fireEvent.press(r.getByLabelText('Send message'));

  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
});

// ---------- source pin: every tab press answers back ----------

// Comments stripped so prose about the rule can't satisfy (or trip) the scan.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

test('the tab shell answers every tab press with the light impact', () => {
  const code = readCode(path.join(ROOT, 'app', '(tabs)', '_layout.jsx'));
  expect(code).toMatch(/tabPress:\s*\(\)\s*=>\s*haptic\.impact\(\)/);
});

// ---------- source scan: no bare Pressable on the tab screens ----------

// Opening tag around a match index — enough to see sibling props. Brace-aware
// so a style={({ pressed }) => ...} arrow inside the tag does not end it.
function elementAround(code, index) {
  const start = code.lastIndexOf('<', index);
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start);
}

// Resolve a relative import to a real file inside the repo, or null.
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const suffix of ['', '.jsx', '.js', '/index.jsx', '/index.js']) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * The five tab screens plus everything they transitively import: if a
 * component can render on a tab screen, its Pressables are in scope.
 */
function tabShellClosure() {
  const seeds = fs
    .readdirSync(path.join(ROOT, 'app', '(tabs)'))
    .filter((f) => /\.jsx$/.test(f))
    .map((f) => path.join(ROOT, 'app', '(tabs)', f));
  const seen = new Set();
  const queue = [...seeds];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const code = readCode(file);
    const re = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(code))) {
      const resolved = resolveImport(file, m[1]);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return [...seen];
}

// A Pressable answers the finger when its style is pressed-aware. Scrims are
// exempt (a backdrop is a dismiss target, not a button) but must say so with
// a "scrim" testID or by hiding from assistive tech like ConfirmContext does.
function isAnswering(tag) {
  return (
    /\(\s*\{\s*pressed\s*\}\s*\)/.test(tag) ||
    /scrim/i.test(tag) ||
    tag.includes('accessibilityElementsHidden')
  );
}

test('every Pressable in the ui kit and on the tab screens answers the press', () => {
  const files = new Set(tabShellClosure());
  for (const entry of fs.readdirSync(path.join(ROOT, 'src', 'components', 'ui'))) {
    if (/\.jsx?$/.test(entry)) files.add(path.join(ROOT, 'src', 'components', 'ui', entry));
  }
  const offenders = [];
  for (const file of files) {
    const code = readCode(file);
    const re = /<Pressable[\s>]/g;
    let m;
    while ((m = re.exec(code))) {
      const tag = elementAround(code, m.index);
      if (!isAnswering(tag)) {
        offenders.push(`${path.relative(ROOT, file)}: ${tag.slice(0, 70).replace(/\s+/g, ' ')}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});
