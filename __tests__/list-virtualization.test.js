// UX-705: growing lists render on FlatList, not ScrollView.map. A ScrollView
// mounts every row up front; a virtualized list mounts only what is visible,
// which is the difference between a smooth scroll and a stutter once an
// elder's history grows. Three surfaces are lists first and screens second,
// so they own the conversion: the messages inbox, the elder's posted
// requests, and the friends invites/requested segments (the find segment was
// already a FlatList). Everything else that maps data does it inside a
// document screen (profile, trust, family, pass-on), where nesting a
// FlatList inside the Screen scroller would disable virtualization anyway —
// those stay on .map and are listed in the audit ledger below with reasons.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
// jest.mock calls are hoisted above these imports, so the mocks land first.
import api from '../src/api/client';
import MessagesInbox from '../app/(tabs)/messages';
import FriendsScreen from '../app/friends/index';
import PostedHelpList from '../src/components/needs/PostedHelpList';

const mockPush = jest.fn();
let mockRole = 'HELPER';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/blockList', () => ({
  getBlocked: jest.fn(async () => []),
  filterBlocked: (list) => list,
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  mockRole = 'HELPER';
});
afterEach(() => jest.clearAllMocks());

// ---------------------------- source pins ----------------------------

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/** The three surfaces UX-705 converted. Their growing lists must stay on a
 *  virtualized FlatList: no raw ScrollView left in the file, every FlatList
 *  carries a stable key and a sensible first render batch, and rows are
 *  memoized components so a list-level render doesn't re-render every row. */
const CONVERTED = [
  'app/(tabs)/messages.jsx',
  'app/friends/index.jsx',
  'src/components/needs/PostedHelpList.jsx',
];

function readCode(file) {
  return fs
    .readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

// Opening tag around a match index — enough to see sibling props.
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

test('converted list surfaces render FlatList, with no raw ScrollView left', () => {
  const offenders = [];
  for (const rel of CONVERTED) {
    const code = readCode(rel);
    if (/\bScrollView\b/.test(code)) offenders.push(`${rel} still references ScrollView`);
    if (!/<FlatList\b/.test(code)) offenders.push(`${rel} renders no FlatList`);
  }
  expect(offenders).toEqual([]);
});

test('every FlatList on a converted surface has keyExtractor and initialNumToRender', () => {
  const offenders = [];
  for (const rel of CONVERTED) {
    const code = readCode(rel);
    const re = /<FlatList\b/g;
    let m;
    while ((m = re.exec(code))) {
      const element = elementAround(code, m.index);
      if (!/\bkeyExtractor=/.test(element)) offenders.push(`${rel}: FlatList without keyExtractor`);
      if (!/\binitialNumToRender=/.test(element))
        offenders.push(`${rel}: FlatList without initialNumToRender`);
    }
  }
  expect(offenders).toEqual([]);
});

test('converted surfaces memoize their row components', () => {
  const offenders = [];
  for (const rel of CONVERTED) {
    const code = readCode(rel);
    if (!/\bmemo\(/.test(code)) offenders.push(`${rel} has no memoized row component`);
  }
  expect(offenders).toEqual([]);
});

// ------------------- audit ledger: .map inside a ScrollView -------------------

/**
 * Files allowed to .map() inside a raw ScrollView, each with a reason a
 * reviewer can check. Fixed option sets don't grow; document screens hold
 * their short bounded lists alongside non-list content, where a nested
 * FlatList would sit inside the scroller and virtualize nothing.
 * A new entry here needs the same justification.
 */
const SCROLLVIEW_MAP_LEDGER = {
  'app/(tabs)/action.jsx': 'CATEGORY options, a fixed set',
  'app/feedback.jsx': 'RATINGS rows, a fixed set',
  'app/profile-edit.jsx': 'GENDERS chips, a fixed set',
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test('no new .map() inside a ScrollView without an audit ledger entry', () => {
  const offenders = [];
  for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))]) {
    const rel = path.relative(ROOT, file);
    const code = readCode(rel);
    const open = /<ScrollView\b/g;
    let m;
    while ((m = open.exec(code))) {
      const close = code.indexOf('</ScrollView>', m.index);
      const block = code.slice(m.index, close === -1 ? code.length : close);
      if (/\.map\(/.test(block) && !SCROLLVIEW_MAP_LEDGER[rel]) {
        offenders.push(rel);
        break;
      }
    }
  }
  expect(offenders).toEqual([]);
});

// ---------------------------- behaviour pins ----------------------------

const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Margaret',
  otherUserRole: 'ELDER',
  otherUserContext: null,
  type: 'HELP',
  status: 'ACTIVE',
  sharedWithFamily: false,
  ...over,
});

test('messages inbox: rows render through the FlatList and keep pull-to-refresh', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/connections')
      return Promise.resolve({
        data: [
          conn(),
          conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'George' }),
          conn({ id: 'c3', otherUserId: 'u3', otherUserName: 'Ada' }),
        ],
      });
    if (url === '/family/journey') return Promise.resolve({ data: { elders: [] } });
    return Promise.resolve({ data: {} });
  });

  const r = await wrap(<MessagesInbox />);
  await r.findByText('Margaret');
  r.getByText('George');
  r.getByText('Ada');

  // The gesture from UX-704 must survive the conversion: the list's host
  // scroller still carries the themed RefreshControl.
  const list = r.getByTestId('inbox-list');
  expect(list.props.refreshControl).toBeTruthy();
});

test('posted requests: cards render through the FlatList and keep pull-to-refresh', async () => {
  mockRole = 'ELDER';
  api.get.mockResolvedValue({
    data: {
      content: [
        {
          id: 'n1',
          title: 'Need a ride to the clinic',
          status: 'OPEN',
          category: 'TRANSPORTATION',
          urgency: 'NORMAL',
          applications: [],
        },
        {
          id: 'n2',
          title: 'Groceries this Friday',
          status: 'OPEN',
          category: 'SHOPPING',
          urgency: 'NORMAL',
          applications: [],
        },
      ],
    },
  });

  const r = await wrap(<PostedHelpList />);
  await r.findByText('Need a ride to the clinic');
  r.getByText('Groceries this Friday');
  // The list sits inside the SwipeSegments wrapper now — find the host
  // that actually carries pull-to-refresh.
  const hostWithRefresh = (el) => {
    if (el?.props?.refreshControl) return el;
    for (const child of el?.children ?? []) {
      if (typeof child === 'string') continue;
      const hit = hostWithRefresh(child);
      if (hit) return hit;
    }
    return null;
  };
  expect(hostWithRefresh(r.root)).toBeTruthy();
});

test('friends invites: cards render through the FlatList with their actions', async () => {
  mockRole = 'ELDER';
  api.get.mockImplementation((url) => {
    if (url === '/connections')
      return Promise.resolve({
        data: [
          conn({
            id: 'p1',
            otherUserId: 'h1',
            otherUserName: 'Ravi',
            otherUserRole: 'HELPER',
            status: 'PENDING',
            initiatedByMe: false,
          }),
          conn({
            id: 'p2',
            otherUserId: 'h2',
            otherUserName: 'Meena',
            otherUserRole: 'HELPER',
            status: 'PENDING',
            initiatedByMe: false,
          }),
        ],
      });
    return Promise.resolve({ data: [] });
  });

  const r = await wrap(<FriendsScreen />);
  await fireEvent.press(await r.findByRole('tab', { name: /New Invites/ }));
  await waitFor(() => r.getByText('Ravi'));
  r.getByText('Meena');
  expect(r.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);
});
