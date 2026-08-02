// Being asked to hold a key (web KeyholderAsk parity): nothing renders until
// something is asked, the numbers are real or absent, both answers are equal
// buttons, and the card acknowledges rather than vanishes.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import KeyholderAsk from '../src/components/passon/KeyholderAsk';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })) },
}));
import api from '../src/api/client';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        {ui}
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

test('renders nothing at all when nobody has asked', async () => {
  api.get.mockResolvedValue({ data: [] });
  const r = await wrap(<KeyholderAsk />);
  expect(r.toJSON()).toBeNull();
});

test('a real ask shows real numbers and answers through the server', async () => {
  api.get.mockResolvedValue({
    data: [{ id: 'kh-1', ownerName: 'Margaret', approvalsNeeded: 2, keyholderCount: 3 }],
  });
  const r = await wrap(<KeyholderAsk />);
  await r.findByText('Margaret has asked you to hold a key.');
  r.getByText('2 of the 3 of you would have to agree, and someone here at Towinly would check first.');
  r.getByText('You can change your mind whenever you like.');

  await fireEvent.press(r.getByRole('button', { name: 'Yes, I will do that' }));
  expect(api.post).toHaveBeenCalledWith('/passon/keyholders/kh-1/respond', { accept: true });
  // The card stays put and acknowledges — never an empty space after a
  // question about a death.
  await r.findByText('Thank you. Margaret will see that you said yes.');
});

test('no threshold sentence is invented before the elder has chosen', async () => {
  api.get.mockResolvedValue({
    data: [{ id: 'kh-2', ownerName: 'Margaret', approvalsNeeded: 0, keyholderCount: 0 }],
  });
  const r = await wrap(<KeyholderAsk />);
  await r.findByText('Margaret has asked you to hold a key.');
  expect(r.queryByText(/would have to agree/)).toBeNull();
});

test('declining is acknowledged with no guilt attached', async () => {
  api.get.mockResolvedValue({
    data: [{ id: 'kh-3', ownerName: 'Margaret', approvalsNeeded: 2, keyholderCount: 3 }],
  });
  const r = await wrap(<KeyholderAsk />);
  await r.findByText('Margaret has asked you to hold a key.');
  await fireEvent.press(r.getByRole('button', { name: 'No thanks' }));
  expect(api.post).toHaveBeenCalledWith('/passon/keyholders/kh-3/respond', { accept: false });
  await r.findByText('That is fine. Nothing more is needed from you.');
});
