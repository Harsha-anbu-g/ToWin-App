// DEEP-08 remainder — the toast's action word ("Undo") must be a real tap
// box, not a bare word. react-native-web drops hitSlop, so on the web build
// the target is only the glyph box unless the Pressable itself has a box:
// minHeight 40 (the sanctioned compact target, Button.jsx quiet variants)
// with centred content. hitSlop stays as a native bonus.
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider, useToast } from '../src/context/ToastContext';

function Trigger({ onAction }) {
  const { showToast } = useToast();
  return (
    <Pressable
      accessibilityLabel="Remove it"
      onPress={() => showToast('Removed', 'info', { actionLabel: 'Undo', onAction })}
    >
      <Text>Remove it</Text>
    </Pressable>
  );
}

function wrap(onAction) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <Trigger onAction={onAction} />
      </ToastProvider>
    </ThemeProvider>
  );
}

test('the toast action is a real tap box: minHeight 40, centred, hitSlop kept', async () => {
  const r = await wrap(jest.fn());
  await fireEvent.press(r.getByLabelText('Remove it'));

  const action = r.getByLabelText('Undo');
  const style = StyleSheet.flatten(action.props.style);
  expect(style.minHeight).toBeGreaterThanOrEqual(40);
  expect(style.justifyContent).toBe('center');
  expect(style.alignItems).toBe('center');
  expect(style.paddingHorizontal).toBeGreaterThanOrEqual(8);
  // Native bonus target stays.
  expect(action.props.hitSlop).toEqual(
    expect.objectContaining({ top: 12, bottom: 12 })
  );
});

test('pressing the action still runs it and clears the toast', async () => {
  const onAction = jest.fn();
  const r = await wrap(onAction);
  await fireEvent.press(r.getByLabelText('Remove it'));
  await fireEvent.press(r.getByLabelText('Undo'));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(r.queryByText('Removed')).toBeNull();
});
