// The Sealed box reveal, locked (web PassOn.sealed.test parity): words live
// only in the card while she looks at them, every refusal is the server's own
// sentence, and the freeze adds somebody to write to.
import { fireEvent, render } from '@testing-library/react-native';
import SealedItemCard from '../src/components/passon/SealedItemCard';
import { ThemeProvider } from '../src/theme/ThemeContext';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

const ITEM = { id: 's1', label: 'Where the money is', kindHint: 'MONEY' };

afterEach(() => jest.clearAllMocks());

test('opens against the password, shows the words, and forgets them on hide', async () => {
  const onReveal = jest.fn(async () => ({ label: 'Where the money is', body: 'Blue tin, top shelf.' }));
  const { getByRole, getByText, getByLabelText, queryByText } = await wrap(
    <SealedItemCard item={ITEM} onRemove={jest.fn()} onReveal={onReveal} />
  );

  getByText('Locked');
  await fireEvent.press(getByRole('button', { name: 'See this' }));
  await fireEvent.changeText(getByLabelText('Your password'), 'pw-1234');
  await fireEvent.press(getByRole('button', { name: 'Show it to me' }));

  expect(onReveal).toHaveBeenCalledWith(ITEM, 'pw-1234');
  getByText('Blue tin, top shelf.');
  getByText('Open');

  await fireEvent.press(getByRole('button', { name: 'Hide this again' }));
  expect(queryByText('Blue tin, top shelf.')).toBeNull();
  getByText('Locked');
});

test('a refusal is the server sentence, word for word', async () => {
  const onReveal = jest.fn(async () => {
    const err = new Error('refused');
    err.response = { data: { message: 'That password is not right. Please try again.' } };
    throw err;
  });
  const { getByRole, getByText, getByLabelText } = await wrap(
    <SealedItemCard item={ITEM} onRemove={jest.fn()} onReveal={onReveal} />
  );
  await fireEvent.press(getByRole('button', { name: 'See this' }));
  await fireEvent.changeText(getByLabelText('Your password'), 'wrong');
  await fireEvent.press(getByRole('button', { name: 'Show it to me' }));
  getByText(/That password is not right. Please try again./);
});

test('the seven-day freeze adds who to write to', async () => {
  const frozen =
    'You changed your password recently. To keep your box safe, it stays shut until 9 August.';
  const onReveal = jest.fn(async () => {
    const err = new Error('frozen');
    err.response = { data: { message: frozen } };
    throw err;
  });
  const { getByRole, getByText, getByLabelText } = await wrap(
    <SealedItemCard
      item={ITEM}
      releaseContactEmail="care@towinly.com"
      onRemove={jest.fn()}
      onReveal={onReveal}
    />
  );
  await fireEvent.press(getByRole('button', { name: 'See this' }));
  await fireEvent.changeText(getByLabelText('Your password'), 'pw');
  await fireEvent.press(getByRole('button', { name: 'Show it to me' }));
  getByText(new RegExp('Write to Towinly at care@towinly.com.'));
});

test('an empty password never leaves the screen', async () => {
  const onReveal = jest.fn();
  const { getByRole, getByText } = await wrap(
    <SealedItemCard item={ITEM} onRemove={jest.fn()} onReveal={onReveal} />
  );
  await fireEvent.press(getByRole('button', { name: 'See this' }));
  await fireEvent.press(getByRole('button', { name: 'Show it to me' }));
  getByText('Please type your password.');
  expect(onReveal).not.toHaveBeenCalled();
});
