// UI kit on Material (react-native-paper): behavioral contracts — press works,
// disabled blocks, labels/errors are accessible, trust stays gold.
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import Button from '../src/components/ui/Button';
import Input from '../src/components/ui/Input';
import Card from '../src/components/ui/Card';
import Avatar from '../src/components/ui/Avatar';
import TrustBadge from '../src/components/ui/TrustBadge';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <PaperProvider>{ui}</PaperProvider>
    </ThemeProvider>
  );

test('primary button fires onPress', async () => {
  const onPress = jest.fn();
  const { getByRole } = await wrap(<Button title="Log in" variant="primary" onPress={onPress} />);
  await fireEvent.press(getByRole('button', { name: 'Log in' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('disabled button blocks touch and exposes the state', async () => {
  const onPress = jest.fn();
  const { getByRole } = await wrap(<Button title="Send" variant="primary" onPress={onPress} disabled />);
  const btn = getByRole('button', { name: 'Send' });
  expect(btn).toBeDisabled();
  await fireEvent.press(btn);
  expect(onPress).not.toHaveBeenCalled();
});

test('secondary and destructive variants render pressable buttons', async () => {
  const a = jest.fn();
  const b = jest.fn();
  const { getByRole } = await wrap(
    <>
      <Button title="Join" variant="secondary" onPress={a} />
      <Button title="Remove" variant="destructive" onPress={b} />
    </>
  );
  await fireEvent.press(getByRole('button', { name: 'Join' }));
  await fireEvent.press(getByRole('button', { name: 'Remove' }));
  expect(a).toHaveBeenCalled();
  expect(b).toHaveBeenCalled();
});

test('input has an accessible label and accepts text', async () => {
  let value = '';
  const { getByLabelText } = await wrap(
    <Input label="Email" value="" onChangeText={(v) => (value = v)} />
  );
  const input = getByLabelText('Email');
  await fireEvent.changeText(input, 'margaret@example.com');
  expect(value).toBe('margaret@example.com');
});

test('input error is announced below the field', async () => {
  const { getByText } = await wrap(
    <Input label="Password" value="" onChangeText={() => {}} error="Please enter your password" />
  );
  const err = getByText('Please enter your password');
  expect(err).toBeOnTheScreen();
  expect(err.props.accessibilityRole).toBe('alert');
});

test('card renders its children on a testable surface', async () => {
  const { getByTestId, getByText } = await wrap(
    <Card testID="card">
      <TrustBadge score={12} />
    </Card>
  );
  expect(getByTestId('card')).toBeOnTheScreen();
  expect(getByText(/12/)).toBeOnTheScreen();
});

test('avatar falls back to initials with a name label', async () => {
  const { getByText, getByLabelText } = await wrap(<Avatar name="Margaret Hall" />);
  expect(getByText('MH')).toBeOnTheScreen();
  expect(getByLabelText('Margaret Hall')).toBeOnTheScreen();
});

test('trust badge stays gold through any reskin', async () => {
  const { getByText } = await wrap(<TrustBadge score={12} />);
  expect(getByText(/12/)).toHaveStyle({ color: '#9C7A3C' });
});
