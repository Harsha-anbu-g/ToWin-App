// MOB-A — what a family member sees about a linked parent.
//
// Locks three things the website establishes and mobile must not soften:
//   1. the parent's check-in state is reported honestly, and "not yet" is
//      neutral rather than alarming;
//   2. only the friendships the parent CHOSE to share appear, and an empty
//      list explains whose choice that was rather than looking broken;
//   3. watching alone is read-only — no button acts for the parent until a
//      power is granted (asking for one is allowed; asking grants nothing).
//
// FAM-506: the deep view (shared friendships, open requests) moved off the
// home list onto the per-parent screen, so those assertions render
// FamilyParentScreen; the at-a-glance status line stays on FamilyHomePanel.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import FamilyParentScreen from '../app/family/parent/[elderId]';
import FamilyHomePanel from '../src/components/family/FamilyHomePanel';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ elderId: 'elder-margaret' }),
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
  useAuth: () => ({ user: { role: 'FAMILY', userId: 'fam-1', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const LINKS = {
  activeLinks: [
    {
      id: 'link-1',
      elderId: 'elder-margaret',
      otherUserId: 'elder-margaret',
      otherUserName: 'Margaret',
      relationship: 'Mother',
      isPrimary: true,
      status: 'ACTIVE',
      initiatedByMe: false,
      iAmElder: false,
      delegatedPowers: [],
    },
  ],
  incomingRequests: [],
  outgoingRequests: [],
};

const JOURNEY = {
  elders: [
    {
      elderId: 'elder-margaret',
      elderName: 'Margaret',
      checkedInToday: true,
      openNeedsCount: 2,
      openNeeds: [
        { id: 'need-1', title: 'A lift to the pharmacy', description: 'Thursday morning' },
        { id: 'need-2', title: 'Help with the garden', description: '' },
      ],
      sharedHelpers: [
        {
          connectionId: 'conn-1',
          helperUserId: 'helper-harsha',
          helperName: 'Harsha',
          stageIndex: 5,
          stageLabel: 'Ready to Meet',
          currentTrustLevel: 'FIRST_MEET',
          readyToMeet: true,
        },
      ],
    },
  ],
};

function stubGet(journey = JOURNEY, links = LINKS) {
  api.get.mockImplementation((url) => {
    if (url === '/family/links') return Promise.resolve({ data: links });
    if (url === '/family/journey') return Promise.resolve({ data: journey });
    if (url === '/family/alerts') return Promise.resolve({ data: { alerts: [] } });
    if (url === '/family/standings') return Promise.resolve({ data: { standings: [] } });
    return Promise.resolve({ data: {} });
  });
}

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
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

afterEach(() => jest.clearAllMocks());

describe('the parent status line', () => {
  test('says so plainly when the parent has checked in today', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('Checked in today')).toBeTruthy();
  });

  test('reports a missing check-in without alarm', async () => {
    stubGet({
      elders: [{ ...JOURNEY.elders[0], checkedInToday: false, openNeedsCount: 0, openNeeds: [] }],
    });
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('No check-in yet today')).toBeTruthy();
  });

  test('counts open help requests, pluralised', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('2 help requests open')).toBeTruthy();
  });

  test('uses the singular for exactly one open request', async () => {
    stubGet({
      elders: [
        { ...JOURNEY.elders[0], openNeedsCount: 1, openNeeds: [JOURNEY.elders[0].openNeeds[0]] },
      ],
    });
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('1 help request open')).toBeTruthy();
  });
});

describe('the parent’s open help requests (per-parent screen)', () => {
  test('lists them read-only', async () => {
    stubGet();
    const r = await wrap(<FamilyParentScreen />);
    await r.findByText('Friendships shared with you');
    await fireEvent.press(r.getByRole('tab', { name: /^Today/ }));
    expect(await r.findByText('A lift to the pharmacy')).toBeTruthy();
    expect(r.getByText('Help with the garden')).toBeTruthy();
  });

  test('shows no heading at all when there are none and no power granted', async () => {
    stubGet({ elders: [{ ...JOURNEY.elders[0], openNeedsCount: 0, openNeeds: [] }] });
    const r = await wrap(<FamilyParentScreen />);
    await r.findByText('Checked in today');
    expect(r.queryByText("Margaret's open help requests")).toBeNull();
  });
});

describe('friendships shared with the family member (per-parent screen)', () => {
  test('shows a shared helper with the parent’s progress', async () => {
    stubGet();
    const r = await wrap(<FamilyParentScreen />);
    expect(await r.findByText('Harsha')).toBeTruthy();
    expect(r.getByText('Stage 6 of 7 · Ready to Meet')).toBeTruthy();
  });

  test('surfaces the ready-to-meet moment', async () => {
    stubGet();
    const r = await wrap(<FamilyParentScreen />);
    expect(await r.findByText('Harsha is getting ready to meet in person')).toBeTruthy();
  });

  test('explains an empty list as the parent’s choice, not a fault', async () => {
    stubGet({ elders: [{ ...JOURNEY.elders[0], sharedHelpers: [] }] });
    const r = await wrap(<FamilyParentScreen />);
    expect(await r.findByText('Margaret chooses which friendships you see here.')).toBeTruthy();
    expect(
      await r.findByText('No friendships shared with you yet. When Margaret shares one, you can:')
    ).toBeTruthy();
  });

  test('offers a way through to the helper’s full profile', async () => {
    stubGet();
    const r = await wrap(<FamilyParentScreen />);
    expect(await r.findByLabelText("See Harsha's full profile")).toBeTruthy();
  });
});

describe('watching alone never acts for the parent', () => {
  test('offers no act-for-them control without a granted power — asking is all that remains', async () => {
    stubGet();
    const r = await wrap(<FamilyParentScreen />);
    await r.findByText('Harsha');
    // The act controls carry the parent's name; none may exist ungranted.
    expect(r.queryByText('Move the next step forward for Margaret')).toBeNull();
    expect(r.queryByText('Leave a review for Margaret')).toBeNull();
    expect(r.queryByText('Ask for help for Margaret')).toBeNull();
    expect(r.queryByText(/Anything you do here is in Margaret/)).toBeNull();
    // The consent list is present — every power off, none granted.
    await fireEvent.press(r.getByRole('tab', { name: 'What I can do' }));
    expect(await r.findAllByText(/Not on yet. You can ask Margaret/)).toHaveLength(3);
  });
});

describe('resilience', () => {
  test('a failed journey fetch still leaves the linked parent visible', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/family/links') return Promise.resolve({ data: LINKS });
      if (url === '/family/journey') return Promise.reject(new Error('network'));
      if (url === '/family/alerts') return Promise.resolve({ data: { alerts: [] } });
      return Promise.resolve({ data: {} });
    });
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('Margaret')).toBeTruthy();
    expect(r.getByText('Linked')).toBeTruthy();
  });
});
