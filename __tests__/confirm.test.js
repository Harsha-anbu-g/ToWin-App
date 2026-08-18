// The confirm gate contract (HCI rule 5: error prevention).
//
// Why this file exists at all: every destructive action in the app used to go
// through Alert.alert, which react-native-web implements as `static alert() {}`
// — a literal no-op. In a browser the dialog never appeared, so Log out, SOS,
// delete account, block/report and the AI consent gate silently did nothing.
// Alert also rendered natively, outside the React tree, so it could never be
// asserted on (see the old comment in my-family.test.js). A real in-tree dialog
// fixes both: it works on web, and its behaviour is now testable.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ConfirmHost, ConfirmProvider, useConfirm } from '../src/context/ConfirmContext';

// A harness that fires confirm() on press and records what it resolved to, so
// the tests assert the PROMISE, not just the pixels. The promise is the whole
// contract — every call site is `if (await confirm(...))`.
function Harness({ options, onResult }) {
  const confirm = useConfirm();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="open"
      onPress={async () => onResult(await confirm(options))}
    >
      <Text>open</Text>
    </Pressable>
  );
}

const OPTIONS = {
  title: 'Send SOS?',
  message: 'This immediately alerts all of your emergency contacts that you need help.',
  cancelLabel: 'Cancel',
  confirmLabel: 'Send SOS',
  destructive: true,
};

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </ThemeProvider>
  );

// Open the dialog and wait for it, so every test starts from the same place.
// wrap() is awaited because render() resolves asynchronously under React 19 —
// the same reason every other suite in this repo awaits it.
const openWith = async (onResult = jest.fn(), options = OPTIONS) => {
  const view = await wrap(<Harness options={options} onResult={onResult} />);
  fireEvent.press(view.getByLabelText('open'));
  await view.findByText(options.title);
  return view;
};

test('renders nothing until a confirm is requested', async () => {
  const { queryByText } = await wrap(<Harness options={OPTIONS} onResult={jest.fn()} />);

  expect(queryByText(OPTIONS.title)).toBeNull();
});

test('shows the title, the message and both button labels', async () => {
  const { getByText, getByLabelText } = await openWith();

  expect(getByText(OPTIONS.message)).toBeTruthy();
  expect(getByLabelText('Cancel')).toBeTruthy();
  expect(getByLabelText('Send SOS')).toBeTruthy();
});

test('confirming resolves true and closes', async () => {
  const onResult = jest.fn();
  const { getByLabelText, queryByText } = await openWith(onResult);

  fireEvent.press(getByLabelText('Send SOS'));

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  expect(queryByText(OPTIONS.title)).toBeNull();
});

test('cancelling resolves false and closes', async () => {
  const onResult = jest.fn();
  const { getByLabelText, queryByText } = await openWith(onResult);

  fireEvent.press(getByLabelText('Cancel'));

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  expect(queryByText(OPTIONS.title)).toBeNull();
});

// HCI rule 3 (user control and freedom): tapping the dimmed backdrop is a way
// out that costs nothing, exactly like LegalModal's scrim. Queried by testID,
// not by label, because the backdrop is deliberately hidden from screen
// readers — the card is accessibilityViewIsModal, and Cancel/back are the
// announced exits.
test('tapping the scrim resolves false', async () => {
  const onResult = jest.fn();
  const { getByTestId } = await openWith(onResult);

  // includeHiddenElements: the backdrop is hidden from the accessibility tree
  // by design, and the query has to opt in to reach it. If this ever starts
  // passing without the flag, the backdrop has stopped being hidden.
  fireEvent.press(getByTestId('confirm-scrim', { includeHiddenElements: true }));

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
});

// Android hardware back / web Escape route through onRequestClose. Losing this
// would trap an elder in a dialog with no visible way out on some devices.
test('a request to close resolves false', async () => {
  const onResult = jest.fn();
  const { getByTestId } = await openWith(onResult);

  fireEvent(getByTestId('confirm-modal'), 'requestClose');

  await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
});

test('defaults to a Cancel/Continue pair when labels are omitted', async () => {
  const { getByLabelText } = await openWith(jest.fn(), { title: 'Discard changes?' });

  expect(getByLabelText('Cancel')).toBeTruthy();
  expect(getByLabelText('Continue')).toBeTruthy();
});

// One idea at a time (HCI rule 8). A second request while one is open must not
// stack dialogs or strand its caller waiting on a promise that never settles —
// the exact failure the AI consent gate had on web.
test('a second confirm while one is open resolves false instead of stacking', async () => {
  const first = jest.fn();
  const second = jest.fn();
  function Double() {
    const confirm = useConfirm();
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="open"
        onPress={() => {
          confirm({ title: 'First?' }).then(first);
          confirm({ title: 'Second?' }).then(second);
        }}
      >
        <Text>open</Text>
      </Pressable>
    );
  }
  const { getByLabelText, getByText, queryByText } = await wrap(<Double />);

  fireEvent.press(getByLabelText('open'));

  await waitFor(() => expect(second).toHaveBeenCalledWith(false));
  expect(getByText('First?')).toBeTruthy();
  expect(queryByText('Second?')).toBeNull();
  expect(first).not.toHaveBeenCalled();
});

// Normal-density floor (owner call 2026-08-17): quiet buttons are 40pt. A confirm dialog is
// the last place to shave that — it is where the irreversible taps happen.
test('both buttons keep a >=40pt target', async () => {
  const { getByLabelText } = await openWith();

  for (const label of ['Cancel', 'Send SOS']) {
    const styles = [getByLabelText(label).props.style].flat(Infinity).filter(Boolean);
    const flat = Object.assign({}, ...styles);
    expect(flat.minHeight).toBeGreaterThanOrEqual(40);
  }
});

// THE HOST RULE (2026-08-17): a confirm() fired from inside an open native
// Modal must render through that sheet's <ConfirmHost />, not as a second
// native modal — on a real iPhone the second modal lands underneath and the
// gated button feels dead (the first TestFlight build's logout and AI consent
// both died this way).
describe('ConfirmHost: dialogs inside sheets', () => {
  test('with a host mounted, the dialog renders through the host and settles', async () => {
    const onResult = jest.fn();
    const view = await render(
      <ThemeProvider>
        <ConfirmProvider>
          <Harness options={OPTIONS} onResult={onResult} />
          <ConfirmHost />
        </ConfirmProvider>
      </ThemeProvider>
    );
    fireEvent.press(view.getByLabelText('open'));
    await view.findByText(OPTIONS.title);

    // Through the host overlay, never a second native modal.
    expect(view.getByTestId('confirm-host-overlay')).toBeTruthy();
    expect(view.queryByTestId('confirm-modal')).toBeNull();

    fireEvent.press(view.getByText(OPTIONS.confirmLabel));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  test('a host unmounting mid-question settles the caller false instead of hanging', async () => {
    const onResult = jest.fn();
    function Shell({ hosted }) {
      return (
        <ThemeProvider>
          <ConfirmProvider>
            <Harness options={OPTIONS} onResult={onResult} />
            {hosted ? <ConfirmHost /> : null}
          </ConfirmProvider>
        </ThemeProvider>
      );
    }
    const view = await render(<Shell hosted />);
    fireEvent.press(view.getByLabelText('open'));
    await view.findByText(OPTIONS.title);

    view.rerender(<Shell hosted={false} />);
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
