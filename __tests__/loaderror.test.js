// LoadError contract (AUD-102): a failed fetch must never masquerade as a
// real empty state — the card says plainly that loading failed and offers
// one obvious retry.
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import LoadError from '../src/components/ui/LoadError';
import { announce } from '../src/lib/announce';

jest.mock('../src/lib/announce', () => ({ announce: jest.fn() }));

beforeEach(() => announce.mockClear());

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <PaperProvider>{ui}</PaperProvider>
    </ThemeProvider>
  );

test('says what failed and retries on tap', async () => {
  const onRetry = jest.fn();
  const { getByRole, getByText } = await wrap(
    <LoadError what="your conversations" onRetry={onRetry} />
  );
  getByText(/couldn't load your conversations/i);
  await fireEvent.press(getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('renders without a retry handler (message only)', async () => {
  const { queryByRole, getByText } = await wrap(<LoadError />);
  getByText(/couldn't load/i);
  expect(queryByRole('button', { name: 'Try again' })).toBeNull();
});

// HARD-109. This card replaces a whole screen. A sighted person sees the swap;
// a screen-reader user was standing on a page that had quietly become something
// else, with nothing said and no role to find it by.
test('the failure is an alert, so a screen reader can find it', async () => {
  const { getByRole } = await wrap(<LoadError what="your conversations" onRetry={jest.fn()} />);
  const alert = getByRole('alert');
  expect(alert).toBeTruthy();
});

test('the retry button stays reachable beside the alert, not swallowed by it', async () => {
  // `accessible` collapses whatever it contains into ONE element. If the alert
  // wrapped the button too, VoiceOver would read the failure and then hide the
  // only way out of it.
  const { getByRole } = await wrap(<LoadError what="your messages" onRetry={jest.fn()} />);
  const alert = getByRole('alert');
  const retry = getByRole('button', { name: 'Try again' });
  expect(alert).toBeTruthy();
  expect(retry).toBeTruthy();
  // Two separate elements: the button is not a descendant of the alert.
  const inAlert = (node) => {
    for (let n = node.parent; n; n = n.parent) if (n === alert) return true;
    return false;
  };
  expect(inAlert(retry)).toBe(false);
});

test('says out loud that the load failed', async () => {
  // accessibilityRole="alert" is a live region in a browser but only a trait on
  // iOS and Android, so the role alone speaks to nobody on a phone.
  await wrap(<LoadError what="your conversations" />);
  expect(announce).toHaveBeenCalledWith(
    "We couldn't load your conversations right now. Please check your connection and try again."
  );
});
