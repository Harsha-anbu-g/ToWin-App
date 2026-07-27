// MOB-A — what a family member sees about a linked parent.
//
// Locks three things the website establishes and mobile must not soften:
//   1. the parent's check-in state is reported honestly, and "not yet" is
//      neutral rather than alarming;
//   2. only the friendships the parent CHOSE to share appear, and an empty
//      list explains whose choice that was rather than looking broken;
//   3. this whole surface is read-only — no button here acts for the parent.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import React from 'react';
import FamilyHomePanel from '../src/components/family/FamilyHomePanel';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

describe('the parent’s open help requests', () => {
  test('lists them read-only', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('A lift to the pharmacy')).toBeTruthy();
    expect(r.getByText('Help with the garden')).toBeTruthy();
  });

  test('shows no heading at all when there are none', async () => {
    stubGet({ elders: [{ ...JOURNEY.elders[0], openNeedsCount: 0, openNeeds: [] }] });
    const r = await wrap(<FamilyHomePanel />);
    await r.findByText('Checked in today');
    expect(r.queryByText('Their open help requests')).toBeNull();
  });
});

describe('friendships shared with the family member', () => {
  test('shows a shared helper with the parent’s progress', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('Harsha')).toBeTruthy();
    expect(r.getByText('Stage 6 of 7 · Ready to Meet')).toBeTruthy();
  });

  test('surfaces the ready-to-meet moment', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByText('They’re getting ready to meet in person')).toBeTruthy();
  });

  test('explains an empty list as the parent’s choice, not a fault', async () => {
    stubGet({ elders: [{ ...JOURNEY.elders[0], sharedHelpers: [] }] });
    const r = await wrap(<FamilyHomePanel />);
    expect(
      await r.findByText(
        'No friendships shared with you yet. Your parent chooses what to share.'
      )
    ).toBeTruthy();
  });

  test('offers a way through to the helper’s full profile', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    expect(await r.findByLabelText("See Harsha's full profile")).toBeTruthy();
  });
});

describe('this surface never acts for the parent', () => {
  test('offers no write-for-them, advance-trust or review action without a granted power', async () => {
    stubGet();
    const r = await wrap(<FamilyHomePanel />);
    await r.findByText('Harsha');
    expect(r.queryByText(/Write to Harsha for/)).toBeNull();
    expect(r.queryByText(/Move the next step/)).toBeNull();
    expect(r.queryByText(/Leave a review/)).toBeNull();
    expect(r.queryByText(/Ask for help for/)).toBeNull();
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
