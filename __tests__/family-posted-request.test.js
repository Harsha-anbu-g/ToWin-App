// Owner call 2026-08-28: "in posted help, if the help is posted by family it
// should show it to the elder and helper and also to the family". The backend
// already files such a request under the elder (NeedService.postNeed: it
// belongs to the parent, sits with the parent's requests, uses the parent's
// address) and only names the writer in NeedResponse.actedByName. The family
// view said "Asked by Sarah, for Margaret" from the start; the elder's Posted
// Help and the helper's Offer Help did not say it at all. Now all three seats
// carry the website's line.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { light } from '../src/theme/tokens';

let mockRole = 'ELDER';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: { content: [] } })),
    post: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

import api from '../src/api/client';
import PostedHelpList from '../src/components/needs/PostedHelpList';
import OfferHelpList from '../src/components/needs/OfferHelpList';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const familyPosted = {
  id: 'n1',
  title: 'Ride to the clinic',
  category: 'TRANSPORTATION',
  urgency: 'NORMAL',
  status: 'OPEN',
  elderId: 'e1',
  elderName: 'Margaret',
  actedByName: 'Sarah',
  applications: [],
};

afterEach(() => jest.clearAllMocks());

test("the elder's Posted Help says who wrote it, folded, before any touch", async () => {
  mockRole = 'ELDER';
  api.get.mockResolvedValue({ data: { content: [familyPosted] } });
  const r = await wrap(<PostedHelpList />);

  await r.findByText('Ride to the clinic');
  const line = r.getByText('Asked by Sarah, for you');
  // Gold: the trust colour, the same line the website and the family view set.
  expect(StyleSheet.flatten(line.props.style).color).toBe(light.trustGold);
  // Spoken with the title, so folding never hides it from a screen reader.
  r.getByRole('button', { name: /Ride to the clinic\. Asked by Sarah, for you\./ });
});

test("a request the elder wrote themselves carries no such line", async () => {
  mockRole = 'ELDER';
  api.get.mockResolvedValue({ data: { content: [{ ...familyPosted, actedByName: null }] } });
  const r = await wrap(<PostedHelpList />);
  await r.findByText('Ride to the clinic');
  expect(r.queryByText(/Asked by/)).toBeNull();
});

test("the helper's Offer Help names the writer and the elder it is for", async () => {
  mockRole = 'HELPER';
  api.get.mockImplementation(async (url) =>
    url === '/needs/open' ? { data: { content: [familyPosted] } } : { data: { content: [] } }
  );
  const r = await wrap(<OfferHelpList />);

  await waitFor(() => r.getByText('Ride to the clinic'));
  const line = r.getByText('Asked by Sarah, for Margaret');
  expect(StyleSheet.flatten(line.props.style).color).toBe(light.trustGold);
});
