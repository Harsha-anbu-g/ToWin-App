// ChipsField (the deferred chips editor), locked by tests: entries render as
// removable chips, return/comma both add, removal rewrites the same
// comma-joined string the form stores, duplicates are refused quietly.
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import ChipsField from '../src/components/ui/ChipsField';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <PaperProvider>{ui}</PaperProvider>
    </ThemeProvider>
  );

test('renders each comma-separated entry as a removable chip', async () => {
  const { getByRole } = await wrap(
    <ChipsField label="My hobbies" value="gardening, chess" onChangeText={() => {}} />
  );

  expect(getByRole('button', { name: 'Remove gardening' })).toBeTruthy();
  expect(getByRole('button', { name: 'Remove chess' })).toBeTruthy();
});

test('pressing return adds the draft to the list', async () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = await wrap(
    <ChipsField label="My hobbies" value="gardening" onChangeText={onChangeText} />
  );

  const field = getByDisplayValue('');
  await fireEvent.changeText(field, 'cooking');
  await fireEvent(field, 'submitEditing');

  expect(onChangeText).toHaveBeenCalledWith('gardening, cooking');
});

test('a typed comma commits immediately (Postel: the old habit still works)', async () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = await wrap(
    <ChipsField label="My hobbies" value="" onChangeText={onChangeText} />
  );

  await fireEvent.changeText(getByDisplayValue(''), 'chess,');

  expect(onChangeText).toHaveBeenCalledWith('chess');
});

test('tapping a chip removes exactly that entry', async () => {
  const onChangeText = jest.fn();
  const { getByRole } = await wrap(
    <ChipsField label="My hobbies" value="gardening, chess, cooking" onChangeText={onChangeText} />
  );

  await fireEvent.press(getByRole('button', { name: 'Remove chess' }));

  expect(onChangeText).toHaveBeenCalledWith('gardening, cooking');
});

test('a duplicate entry is refused without rewriting the value', async () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = await wrap(
    <ChipsField label="My hobbies" value="Chess" onChangeText={onChangeText} />
  );

  const field = getByDisplayValue('');
  await fireEvent.changeText(field, 'chess');
  await fireEvent(field, 'submitEditing');

  expect(onChangeText).not.toHaveBeenCalled();
});
