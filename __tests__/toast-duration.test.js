// A toast is gone in four seconds. That is plenty for "Saved" and no time at
// all for the one message that matters: who an SOS did and did not reach.
// A caller can ask for longer.
import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider, useToast } from '../src/context/ToastContext';

const WORDS = 'No text message was sent. Call them now.';

function Trigger({ options }) {
  const { showToast } = useToast();
  return (
    <Pressable accessibilityLabel="Send" onPress={() => showToast(WORDS, 'info', options)}>
      <Text>Send</Text>
    </Pressable>
  );
}

const wrap = (options) =>
  render(
    <ThemeProvider>
      <ToastProvider>
        <Trigger options={options} />
      </ToastProvider>
    </ThemeProvider>
  );

const wait = (ms) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

afterEach(() => jest.useRealTimers());

test('a toast that asks for fifteen seconds is still there after five', async () => {
  const r = await wrap({ duration: 15000 });
  jest.useFakeTimers();
  await fireEvent.press(r.getByLabelText('Send'));

  await wait(5000);
  expect(r.queryByText(WORDS)).not.toBeNull();

  await wait(10000);
  expect(r.queryByText(WORDS)).toBeNull();
});

test('a toast that asks for nothing still leaves after four seconds', async () => {
  const r = await wrap();
  jest.useFakeTimers();
  await fireEvent.press(r.getByLabelText('Send'));

  await wait(4000);
  expect(r.queryByText(WORDS)).toBeNull();
});
