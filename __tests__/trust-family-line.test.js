// Trust screen family line (FAM-405), locked by tests: the elder header
// mentions the family point (helper copy untouched), the FamilyCard renders
// only when the backend sends `family` (ELDER role only), dots and the
// "+earned of max" label are data-driven, and the per-customer Family meter
// row appears only when familyMax > 0. The 7+5+3 / 7+5+2+1 = 15 math itself
// is backend data — nothing here recomputes it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

// Role comes from the signed JWT in the real provider — the stub lets each
// test pin the seat (ELDER sees the family line, HELPER never does).
let mockRole = 'ELDER';
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'u1', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';
import TrustScreen from '../app/trust/index';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown warning) */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Breakdown fixtures (API contract §5): `family` is sent for ELDER only —
// flat { earned: 0|1, max: 1 }; per-customer familyMax is 1 for elders, 0 for
// everyone else. Elder customer cards therefore carry profileMax 2.
const elderCustomer = {
  connectionId: 'c1', customerName: 'Harsha', customerPhotoUrl: null, stageIndex: 2,
  total: 9, totalMax: 15, rooting: 3, rootingMax: 7, review: 3, reviewMax: 5,
  profile: 2, profileMax: 2, family: 1, familyMax: 1,
};
const helperCustomer = {
  connectionId: 'c2', customerName: 'Margaret', customerPhotoUrl: null, stageIndex: 2,
  total: 8, totalMax: 15, rooting: 3, rootingMax: 7, review: 3, reviewMax: 5,
  profile: 2, profileMax: 3, family: 0, familyMax: 0,
};

const stubScore = (breakdown) =>
  api.get.mockImplementation(async (url) => {
    if (url === '/trust/my-score') return { data: breakdown };
    return { data: {} };
  });

afterEach(() => jest.clearAllMocks());

test('elder with family: header mentions the point, card and per-customer row render', async () => {
  mockRole = 'ELDER';
  stubScore({ totalScore: 10, tier: 'Getting Started', family: { earned: 1, max: 1 }, customers: [elderCustomer] });
  const r = await wrap(<TrustScreen />);

  r.getByText(
    'Each helper you grow trust with can earn you up to 15 points: 7 for growing trust together, 5 from their review, 2 for your profile, and 1 for family connected.'
  );
  await r.findByText('Family connected');
  r.getByText('One point for having your family connected, however many family members you add.');
  r.getByLabelText('+1 of 1');

  // Per-customer meter row (familyMax > 0) sits with the other meters.
  r.getByText('Family');
  r.getByText('1/1');
});

test('elder with no family linked yet: dots and label read +0 of 1', async () => {
  mockRole = 'ELDER';
  stubScore({ totalScore: 2, tier: 'Getting Started', family: { earned: 0, max: 1 }, customers: [] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('Family connected');
  r.getByLabelText('+0 of 1');
});

test('helper: copy unchanged, no family card, no Family meter row', async () => {
  mockRole = 'HELPER';
  stubScore({ totalScore: 8, tier: 'Getting Started', family: null, customers: [helperCustomer] });
  const r = await wrap(<TrustScreen />);

  r.getByText(
    'Each person you help can earn you up to 15 points: 7 for growing trust together, 5 from their review, and 3 for your profile.'
  );
  await r.findByText('Margaret');
  expect(r.queryByText('Family connected')).toBeNull();
  expect(r.queryByText('Family')).toBeNull();
});

// FAM-407: FAMILY viewers have no helpers, no reviews, and no add-friends
// surface anywhere in their app — the elder scoring rules and the "add
// someone" empty state would be dishonest dead ends (HCI 2/7). Their points
// come from their profile only (backend /trust/my-score, no role guard).
test('FAMILY: profile-only copy — no elder scoring rules, no add-someone dead end', async () => {
  mockRole = 'FAMILY';
  stubScore({ totalScore: 1, tier: 'Getting Started', family: null, customers: [] });
  const r = await wrap(<TrustScreen />);

  r.getByText('Your score comes from your profile. Fill it in to earn your first points.');
  await r.findByText(
    'Your trust score grows from your profile. Trust between your parent and their helpers grows on their side.'
  );
  expect(r.queryByText(/Each helper you grow trust with/)).toBeNull();
  expect(r.queryByText('Trust starts with a friend. Add someone, and your points appear here.')).toBeNull();
  expect(r.queryByText('Family connected')).toBeNull();
});
