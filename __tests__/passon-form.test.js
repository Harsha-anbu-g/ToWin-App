// The pass-on form's payload rules, locked (web PassOn.test / PassOn.after.test
// parity): a story never sends releaseWhen, a letter ALWAYS does — the server
// reads a missing one as "read it today", so an omission would quietly hand a
// held letter to a living person on a typo-fix save.
import { fireEvent, render } from '@testing-library/react-native';
import PassOnItemForm from '../src/components/passon/PassOnItemForm';
import { ThemeProvider } from '../src/theme/ThemeContext';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

const PEOPLE = [
  { id: 'p1', name: 'Sarah', note: 'Daughter' },
  { id: 'p2', name: 'Tom', note: 'Helper you trust' },
];

afterEach(() => jest.clearAllMocks());

test('a story sends audience and no releaseWhen', async () => {
  const onSave = jest.fn();
  const { getByLabelText, getByRole } = await wrap(
    <PassOnItemForm kind="STORY" initial={null} people={PEOPLE} saving={false} onSave={onSave} onCancel={jest.fn()} />
  );
  await fireEvent.changeText(getByLabelText('Give it a name'), 'The winter we lost the roof');
  await fireEvent.changeText(getByLabelText('Tell it'), 'It began with the rain.');
  await fireEvent.press(getByRole('button', { name: 'Save this story' }));
  expect(onSave).toHaveBeenCalledWith({
    kind: 'STORY',
    title: 'The winter we lost the roof',
    body: 'It began with the rain.',
    audience: 'FAMILY',
    audienceUserId: null,
  });
  expect(onSave.mock.calls[0][0]).not.toHaveProperty('releaseWhen');
});

test('a letter requires its one person and always sends releaseWhen', async () => {
  const onSave = jest.fn();
  const { getByLabelText, getByRole, getByText } = await wrap(
    <PassOnItemForm kind="LETTER" initial={null} people={PEOPLE} canHoldUntilGone saving={false} onSave={onSave} onCancel={jest.fn()} />
  );
  await fireEvent.changeText(getByLabelText('Give it a name'), 'For Sarah');
  await fireEvent.changeText(getByLabelText('Write it'), 'My dear.');
  await fireEvent.press(getByRole('button', { name: 'Save this letter' }));
  getByText('Please choose the one person this is for.');
  expect(onSave).not.toHaveBeenCalled();

  await fireEvent.press(getByRole('radio', { name: 'Sarah, Daughter' }));
  await fireEvent.press(getByRole('button', { name: 'Save this letter' }));
  expect(onSave).toHaveBeenCalledWith({
    kind: 'LETTER',
    title: 'For Sarah',
    body: 'My dear.',
    audience: 'PERSON',
    audienceUserId: 'p1',
    releaseWhen: 'NOW',
  });
});

test('without a sealed box the hold is shown disabled with the reason, never hidden', async () => {
  const onGo = jest.fn();
  const { getByRole, getByText } = await wrap(
    <PassOnItemForm
      kind="LETTER"
      initial={null}
      people={PEOPLE}
      canHoldUntilGone={false}
      saving={false}
      onSave={jest.fn()}
      onCancel={jest.fn()}
      onGoToSealedBox={onGo}
    />
  );
  const after = getByRole('radio', { name: /Only after I'm gone/ });
  expect(after.props.accessibilityState.disabled).toBe(true);
  getByText(
    'First choose the people who can open things for you, in your Sealed box. Then you can hold ' +
      'a letter until after you are gone.'
  );
  await fireEvent.press(getByText('Go to my Sealed box'));
  expect(onGo).toHaveBeenCalled();
});

test('a letter already held stays offerable with no sealed box (undo must not flip it)', async () => {
  const onSave = jest.fn();
  const held = {
    id: 'l1',
    kind: 'LETTER',
    title: 'For Sarah',
    body: 'Keep this.',
    audience: 'PERSON',
    audienceUserId: 'p1',
    releaseWhen: 'AFTER',
  };
  const { getByRole } = await wrap(
    <PassOnItemForm kind="LETTER" initial={held} people={PEOPLE} canHoldUntilGone={false} saving={false} onSave={onSave} onCancel={jest.fn()} />
  );
  const after = getByRole('radio', { name: /Only after I'm gone/ });
  expect(after.props.accessibilityState.disabled).toBeFalsy();
  await fireEvent.press(getByRole('button', { name: 'Save this letter' }));
  expect(onSave.mock.calls[0][0].releaseWhen).toBe('AFTER');
});

test('the bank-details warning sits on the story form', async () => {
  const { getByText } = await wrap(
    <PassOnItemForm kind="STORY" initial={null} people={PEOPLE} saving={false} onSave={jest.fn()} onCancel={jest.fn()} />
  );
  getByText(/Please keep things a bank would ask you/);
});
