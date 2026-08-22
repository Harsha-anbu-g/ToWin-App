// HARD-109. Validation that only exists in red.
//
// Input and the register submit banner both already carried
// accessibilityRole="alert", and that was the trap: on the phone-web build
// react-native-web turns the role into a real aria live region and the browser
// reads it out, so the behaviour looked correct wherever it was easiest to
// check. On iOS and Android the role is a TRAIT, not a live region. Nothing is
// spoken. A person who cannot see the red row pressed Save and heard silence,
// which is indistinguishable from a dead button.
//
// Input's own header comment had claimed "error (announced)" since the file was
// written, which is how it survived this long.
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import Input from '../src/components/ui/Input';
import { announce } from '../src/lib/announce';

jest.mock('../src/lib/announce', () => ({ announce: jest.fn() }));

beforeEach(() => announce.mockClear());

// One stable shell so a rerender updates the field in place instead of
// replacing the tree. The props under test are the point, not the mount.
function Shell({ error, value = '' }) {
  return (
    <ThemeProvider>
      <PaperProvider>
        <Input label="Email" value={value} onChangeText={() => {}} error={error} />
      </PaperProvider>
    </ThemeProvider>
  );
}

test('a field with no error says nothing', async () => {
  await render(<Shell />);
  expect(announce).not.toHaveBeenCalled();
});

test('an error arriving is said out loud', async () => {
  const view = await render(<Shell />);
  await view.rerender(<Shell error="Enter your email address." />);
  view.getByText('Enter your email address.');
  expect(announce).toHaveBeenCalledWith('Enter your email address.');
});

test('a field that mounts already in error still says it', async () => {
  // Submit-time validation sets every field's error in one pass; a field that
  // was not on screen before must not be the silent one.
  await render(<Shell error="Enter your email address." />);
  expect(announce).toHaveBeenCalledWith('Enter your email address.');
});

test('the same error is not repeated on every keystroke', async () => {
  // The field re-renders per character. Re-announcing an unchanged message
  // would talk over the typing that is fixing it.
  const view = await render(<Shell error="Enter your email address." />);
  expect(announce).toHaveBeenCalledTimes(1);

  await view.rerender(<Shell error="Enter your email address." value="a" />);
  await view.rerender(<Shell error="Enter your email address." value="ab" />);
  expect(announce).toHaveBeenCalledTimes(1);
});

test('a different error replacing the first is said', async () => {
  const view = await render(<Shell error="Enter your email address." />);
  await view.rerender(<Shell error="That doesn't look like an email address." />);
  expect(announce).toHaveBeenCalledTimes(2);
  expect(announce).toHaveBeenLastCalledWith("That doesn't look like an email address.");
});

test('clearing the error is silent, and a later one speaks again', async () => {
  const view = await render(<Shell error="Enter your email address." />);
  announce.mockClear();

  // Fixing it must not read the error back at the person one last time.
  await view.rerender(<Shell error="" value="me@example.com" />);
  expect(announce).not.toHaveBeenCalled();

  await view.rerender(<Shell error="Enter your email address." />);
  expect(announce).toHaveBeenCalledWith('Enter your email address.');
});

test('the error row stays a single alert element', async () => {
  const view = await render(<Shell error="Enter your email address." />);
  const alert = view.getByRole('alert');
  expect(alert.props.accessible).toBe(true);
});

test("the header's claim of announcement is now true", () => {
  // The comment was the reason nobody looked. Keep the two tied together.
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'ui', 'Input.jsx'),
    'utf8'
  );
  expect(src).toMatch(/error \(announced/);
  expect(src).toMatch(/announce\(error\)/);
});
