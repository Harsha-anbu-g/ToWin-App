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
import SegmentedControl from '../src/components/ui/SegmentedControl';
import Chip from '../src/components/ui/Chip';
import NavRow from '../src/components/ui/NavRow';

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
  // Initials are visual-only — screen readers get the full name label instead
  expect(getByText('MH', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(getByLabelText('Margaret Hall')).toBeOnTheScreen();
});

test('trust badge stays gold through any reskin', async () => {
  const { getByText } = await wrap(<TrustBadge score={12} />);
  expect(getByText(/12/)).toHaveStyle({ color: '#9C7A3C' });
});

// --- 2026-07-11 redesign kit (Claude Design handoff) ---

const SEGMENTS = [
  { key: 'open', label: 'Looking for Help', count: 1 },
  { key: 'progress', label: 'In Progress', count: 1 },
  { key: 'done', label: 'Completed', count: 1 },
];

test('segmented control marks the active tab and switches on press', async () => {
  const onChange = jest.fn();
  const { getByRole } = await wrap(
    <SegmentedControl segments={SEGMENTS} value="open" onChange={onChange} />
  );
  const active = getByRole('tab', { name: /Looking for Help/ });
  expect(active.props.accessibilityState.selected).toBe(true);
  await fireEvent.press(getByRole('tab', { name: /In Progress/ }));
  expect(onChange).toHaveBeenCalledWith('progress');
});

test('segmented control shows per-segment counts', async () => {
  const { getAllByText } = await wrap(
    <SegmentedControl segments={SEGMENTS} value="open" onChange={() => {}} />
  );
  expect(getAllByText('1')).toHaveLength(3);
});

test('chip fires onPress and exposes its selected state', async () => {
  const onPress = jest.fn();
  const { getByRole, rerender } = await wrap(
    <Chip label="Shopping" selected={false} onPress={onPress} />
  );
  const chip = getByRole('button', { name: 'Shopping' });
  expect(chip.props.accessibilityState.selected).toBe(false);
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('nav row: menu and add-friends targets fire, trust pill reads score', async () => {
  const onMenu = jest.fn();
  const onAddFriends = jest.fn();
  const { getByRole, getByText } = await wrap(
    <NavRow trustScore={24} onMenu={onMenu} onAddFriends={onAddFriends} />
  );
  await fireEvent.press(getByRole('button', { name: 'Menu' }));
  await fireEvent.press(getByRole('button', { name: 'Add friends' }));
  expect(onMenu).toHaveBeenCalled();
  expect(onAddFriends).toHaveBeenCalled();
  expect(getByText('24')).toBeOnTheScreen();
  expect(getByText('trust')).toHaveStyle({ color: '#9C7A3C' });
});
