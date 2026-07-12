// LoadError contract (AUD-102): a failed fetch must never masquerade as a
// real empty state — the card says plainly that loading failed and offers
// one obvious retry.
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import LoadError from '../src/components/ui/LoadError';

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
