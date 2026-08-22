// POST /needs must never carry coordinates. This is a lock, not a feature.
//
// WHY, read off the server that receives it. ToWin/backend/src/main/java/com/
// towinly/need/service/NeedService.java:81-86, quoted:
//
//     BigDecimal lat = request.getLocationLat() != null
//             ? BigDecimal.valueOf(request.getLocationLat())
//             : elder.getLocationLat();
//     BigDecimal lng = request.getLocationLng() != null
//             ? BigDecimal.valueOf(request.getLocationLng())
//             : elder.getLocationLng();
//
// `elder` on line 79 is the on-behalf target, resolved from onBehalfOfElderId.
// So any coordinate in the body WINS over the elder's own stored position. A
// daughter in Toronto posting for her mother in Montreal would stamp Toronto
// onto her mother's request, and every helper near her mother would stop
// seeing it. The mother never typed that, never saw it, and cannot undo it.
//
// Today no screen sends coordinates. That is correct by accident, not by rule.
// LOC-203 through LOC-206 add location to the screens around these two forms,
// so the rule is written down here first, before any of them run.
//
// If this test fails, do NOT add coordinates to make a distance look better.
// The elder's own position already reaches the need through
// elder.getLocationLat(). Save THAT, with PUT /profile/location through
// src/lib/deviceLocation.js savePosition, which is what LOC-201 built.
//
// A note for whoever edits this file: render() and fireEvent() are async in
// @testing-library/react-native 14. Every one of them needs an await, or the
// press lands before the state change and the assertion reads an empty mock.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  Redirect: () => null,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: { content: [] } })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

import api from '../src/api/client';
import ActionScreen from '../app/(tabs)/action';
import FamilyNeedsForParent from '../src/components/family/FamilyNeedsForParent';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime Infinity: the default 5 minute gc timer outlives the worker */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/** The body of the one POST that created a need, whoever sent it. */
const createBody = () => {
  const call = api.post.mock.calls.find(([url]) => url === '/needs');
  expect(call).toBeDefined();
  return call[1];
};

afterEach(() => jest.clearAllMocks());

describe('an elder posting for themselves', () => {
  test('sends no coordinates, so the request keeps the position on their account', async () => {
    const r = await wrap(<ActionScreen />);
    await fireEvent.changeText(r.getByLabelText('Title'), 'A ride to the clinic on Thursday');
    await fireEvent.press(r.getByRole('button', { name: 'Post Help' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/needs', expect.any(Object)));
    const body = createBody();
    expect(body).not.toHaveProperty('locationLat');
    expect(body).not.toHaveProperty('locationLng');
    // What it DOES send, so a future field addition is a deliberate change.
    expect(Object.keys(body).sort()).toEqual(['category', 'description', 'title', 'urgency']);
  });
});

describe('a family member posting for their parent', () => {
  const renderForm = () =>
    wrap(
      <FamilyNeedsForParent elderId="elder-margaret" elderName="Margaret" openNeeds={[]} canManage />
    );

  test('sends onBehalfOfElderId and no coordinates, so the parent position is used', async () => {
    // NeedService.java:79 resolves `elder` from onBehalfOfElderId, then :81-86
    // lets a coordinate in the body beat elder.getLocationLat(). Sending the
    // family member's phone here moves the parent's request to the family
    // member's town.
    const r = await renderForm();
    await fireEvent.press(r.getByRole('button', { name: 'Ask for help for Margaret' }));
    await fireEvent.changeText(
      r.getByLabelText('What does Margaret need help with?'),
      'A ride to the doctor on Tuesday'
    );
    await fireEvent.press(r.getByRole('button', { name: 'Send for Margaret' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/needs', expect.any(Object)));
    const body = createBody();
    expect(body.onBehalfOfElderId).toBe('elder-margaret');
    expect(body).not.toHaveProperty('locationLat');
    expect(body).not.toHaveProperty('locationLng');
    expect(Object.keys(body).sort()).toEqual([
      'category',
      'description',
      'onBehalfOfElderId',
      'title',
      'urgency',
    ]);
  });
});

// The two tests above lock what today's two forms send. The three below lock
// every form that has not been written yet: they read the source rather than
// running it, so a third posting screen is covered the day somebody adds it.
describe('every POST /needs call site in the repo', () => {
  const ROOTS = ['app', 'src'];
  const CODE = /\.(js|jsx)$/;
  const APP = path.join(__dirname, '..');

  /** Every source file under app/ and src/, path relative to App/. */
  const sourceFiles = () => {
    const found = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (CODE.test(entry.name)) found.push(full);
      }
    };
    ROOTS.forEach((root) => walk(path.join(APP, root)));
    return found.map((f) => path.relative(APP, f)).sort();
  };

  const read = (file) => fs.readFileSync(path.join(APP, file), 'utf8');

  /**
   * The full text of every `<something>.post(...)` call whose path mentions
   * /needs. Parentheses are matched by counting, so a multi-line object
   * literal comes back whole instead of truncated at the first newline. The
   * receiver is any identifier, not just `api`, so a renamed client is still
   * caught.
   */
  const needsPostCalls = (source) => {
    const calls = [];
    const opener = /\b[A-Za-z_$][\w$]*\.post\(/g;
    let match;
    while ((match = opener.exec(source)) !== null) {
      const open = match.index + match[0].length - 1;
      let depth = 0;
      let end = open;
      for (let i = open; i < source.length; i += 1) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const text = source.slice(match.index, end + 1);
      if (/\/needs/.test(text)) {
        calls.push({ text, line: source.slice(0, match.index).split('\n').length });
      }
    }
    return calls;
  };

  /** A call that creates a need, as opposed to accepting or completing one. */
  const createsANeed = ({ text }) => /['"`]\/needs['"`]/.test(text);

  const leak = (file, line, what) =>
    `${file}:${line} passes ${what} to POST /needs.\n\n` +
    'NeedService.java:81-86 lets a coordinate in the body override the stored\n' +
    'position of the elder the request belongs to, and `elder` there is the\n' +
    'on-behalf target. A family member posting for their parent would stamp\n' +
    'their own phone onto their parent request, and helpers near the parent\n' +
    'would stop seeing it.\n\n' +
    'Remove the coordinates. The position of the elder already reaches the need\n' +
    'through elder.getLocationLat(). Save that instead, with PUT /profile/location\n' +
    'through savePosition in src/lib/deviceLocation.js.';

  test('passes no coordinates', () => {
    const offenders = [];
    for (const file of sourceFiles()) {
      for (const call of needsPostCalls(read(file))) {
        for (const field of ['locationLat', 'locationLng']) {
          if (call.text.includes(field)) offenders.push(leak(file, call.line, field));
        }
      }
    }
    expect(offenders.join('\n\n')).toBe('');
  });

  // One call site hands `body` in as a variable, so reading the call text
  // alone cannot see a coordinate assigned a few lines above it. Any file that
  // creates a need must therefore not mention the fields at all. This is the
  // assertion that survives a refactor.
  test('lives in a file that never mentions locationLat or locationLng', () => {
    const offenders = [];
    for (const file of sourceFiles()) {
      const source = read(file);
      if (!needsPostCalls(source).some(createsANeed)) continue;
      for (const field of ['locationLat', 'locationLng']) {
        const at = source.indexOf(field);
        if (at !== -1) offenders.push(leak(file, source.slice(0, at).split('\n').length, field));
      }
    }
    expect(offenders.join('\n\n')).toBe('');
  });

  test('finds the two creating call sites, so the scan is not matching nothing', () => {
    const creators = sourceFiles().filter((file) => needsPostCalls(read(file)).some(createsANeed));
    expect(creators).toEqual([
      'app/(tabs)/action.jsx',
      'src/components/family/FamilyNeedsForParent.jsx',
    ]);
  });
});
