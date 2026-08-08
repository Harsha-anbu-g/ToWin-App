// DelegatedPowerToggle (FAM-503), locked by tests: three switches straight
// from the shared POWERS vocabulary, replace semantics (every flip PUTs the
// WHOLE set the elder wants to keep), optimistic flip with the server's
// answer winning, rollback + toast on failure. Mirrors the website's
// DelegatedPowerToggle.jsx against PUT /family/links/{id}/powers.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: {} })),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (err, fallback) => fallback,
}));

// Reduce motion pinned on: the knob snaps via setValue (app convention).
jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import DelegatedPowerToggle from '../src/components/family/DelegatedPowerToggle';
import { POWERS } from '../src/lib/familyPowers';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: Infinity },
              mutations: { retry: false, gcTime: Infinity },
            },
          })
        }
      >
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

test('renders one switch per power, in the shared vocabulary order', async () => {
  const r = await wrap(<DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={[]} />);
  for (const p of POWERS) {
    r.getByText(p.title);
    r.getByText(p.off('Sarah')); // all off → every off line, personal
  }
  expect(r.getAllByRole('switch')).toHaveLength(3);
});

test('granted powers arrive checked, with the on wording', async () => {
  const r = await wrap(
    <DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={['ADVANCE_TRUST']} />
  );
  const advance = POWERS.find((p) => p.key === 'ADVANCE_TRUST');
  r.getByText(advance.on('Sarah'));
  r.getByRole('switch', { name: `${advance.title}, Sarah`, checked: true });
});

test('a flip PUTs the WHOLE next set, not a delta', async () => {
  let resolvePut;
  api.put.mockImplementation(() => new Promise((resolve) => { resolvePut = resolve; }));
  const r = await wrap(
    <DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={['MANAGE_HELP_REQUESTS']} />
  );

  const advance = POWERS.find((p) => p.key === 'ADVANCE_TRUST');
  await fireEvent.press(r.getByRole('switch', { name: `${advance.title}, Sarah` }));

  // Replace semantics: the kept power rides along with the newly ticked one.
  expect(api.put).toHaveBeenCalledTimes(1);
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe('/family/links/l1/powers');
  expect([...body.powers].sort()).toEqual(['ADVANCE_TRUST', 'MANAGE_HELP_REQUESTS']);

  // Optimistic: the on line shows while the PUT is still in flight.
  r.getByText(advance.on('Sarah'));

  await act(async () =>
    resolvePut({ data: { id: 'l1', delegatedPowers: ['MANAGE_HELP_REQUESTS', 'ADVANCE_TRUST'] } })
  );
  r.getByRole('switch', { name: `${advance.title}, Sarah`, checked: true });
});

test("the server's answer wins over the optimistic guess", async () => {
  // Elder ticks LEAVE_REVIEWS but the server (the record that decides)
  // answers with it absent — the switch must settle back off.
  api.put.mockResolvedValue({ data: { id: 'l1', delegatedPowers: [] } });
  const r = await wrap(<DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={[]} />);

  const reviews = POWERS.find((p) => p.key === 'LEAVE_REVIEWS');
  await fireEvent.press(r.getByRole('switch', { name: `${reviews.title}, Sarah` }));

  await r.findByText(reviews.off('Sarah'));
  r.getByRole('switch', { name: `${reviews.title}, Sarah`, checked: false });
});

test('failure rolls the flip back and toasts', async () => {
  api.put.mockRejectedValue(new Error('network down'));
  const r = await wrap(
    <DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={['LEAVE_REVIEWS']} />
  );

  const reviews = POWERS.find((p) => p.key === 'LEAVE_REVIEWS');
  await fireEvent.press(r.getByRole('switch', { name: `${reviews.title}, Sarah` }));

  await r.findByText("Couldn't save that change. Please try again.");
  r.getByRole('switch', { name: `${reviews.title}, Sarah`, checked: true });
  r.getByText(reviews.on('Sarah'));
});

test('onSaved receives the fresh link so the caller can patch its cache', async () => {
  const fresh = { id: 'l1', delegatedPowers: ['MANAGE_HELP_REQUESTS'] };
  api.put.mockResolvedValue({ data: fresh });
  const onSaved = jest.fn();
  const r = await wrap(
    <DelegatedPowerToggle linkId="l1" familyName="Sarah" powers={[]} onSaved={onSaved} />
  );

  const manage = POWERS.find((p) => p.key === 'MANAGE_HELP_REQUESTS');
  await fireEvent.press(r.getByRole('switch', { name: `${manage.title}, Sarah` }));
  await r.findByText(manage.on('Sarah'));
  expect(onSaved).toHaveBeenCalledWith(fresh);
});
