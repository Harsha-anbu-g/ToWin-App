// HARD-099, bug 2: there was no error boundary anywhere in the app.
//
// `grep -rn ErrorBoundary app src` returned nothing before this story, and
// React unmounts the whole tree when a render throws. So any render error,
// including the null-name TypeError pinned in avatar-null-name.test.js, left
// an elder holding a blank white phone with no retry and no way back short of
// force-quitting.
//
// Three things are pinned here.
//   1. A throw inside the boundary shows plain words and a way to recover.
//   2. The fallback needs NO providers. It renders in place of RootLayout, so
//      the theme, the fonts, the toasts and the query client are all gone by
//      the time it paints. If someone later reaches for useTheme() in there,
//      this test goes red instead of the phone going blank.
//   3. The root layout still exports it under the name expo-router looks for.
//      That export IS the wiring: useScreens.js only wraps a route in <Try>
//      when the route module exports `ErrorBoundary`.
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import AppErrorBoundary, { ErrorFallback } from '../src/components/AppErrorBoundary';

// React itself logs a caught render error, and so does componentDidCatch on
// purpose (no crash reporter is wired up yet). Neither is a test failure.
let consoleError;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

const Boom = ({ explode }) => {
  if (explode) throw new TypeError("Cannot read properties of null (reading 'trim')");
  return <Text>the screen</Text>;
};

test('a render throw shows the fallback instead of a blank screen', async () => {
  const r = await render(
    <AppErrorBoundary>
      <Boom explode />
    </AppErrorBoundary>
  );
  expect(r.getByText('Something went wrong')).toBeTruthy();
  expect(r.queryByText('the screen')).toBeNull();
});

test('the fallback offers a way back and retrying clears the error', async () => {
  // Two renders of the same tree: the first throws, the second does not, which
  // is what a transient bad payload looks like on a real phone.
  const Flaky = () => {
    const explode = !cleared;
    return <Boom explode={explode} />;
  };
  let cleared = false;

  const r = await render(
    <AppErrorBoundary>
      <Flaky />
    </AppErrorBoundary>
  );
  const retry = r.getByRole('button', { name: 'Try again' });
  expect(retry).toBeTruthy();

  cleared = true;
  await fireEvent.press(retry);

  expect(r.getByText('the screen')).toBeTruthy();
  expect(r.queryByText('Something went wrong')).toBeNull();
});

test('the same error twice still shows the fallback, never a blank screen', async () => {
  // Retrying a genuinely broken screen must land back on the fallback. A
  // boundary that clears its state and then unmounts on the re-throw would be
  // worse than no boundary at all.
  const r = await render(
    <AppErrorBoundary>
      <Boom explode />
    </AppErrorBoundary>
  );
  await fireEvent.press(r.getByRole('button', { name: 'Try again' }));
  expect(r.getByText('Something went wrong')).toBeTruthy();
});

test('the fallback paints with no providers around it at all', async () => {
  // No ThemeProvider, no FontGate, no ToastProvider, no query client. This is
  // exactly the tree the fallback gets when the root layout is what failed.
  const r = await render(<ErrorFallback error={new Error('boom')} retry={() => {}} />);
  expect(r.getByText('Something went wrong')).toBeTruthy();
  expect(r.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(
    r.getByText('This screen stopped working, and you did nothing wrong. Tap Try again.')
  ).toBeTruthy();
});

test('the words are plain and the heading is a heading', async () => {
  const r = await render(<ErrorFallback error={new Error('boom')} retry={() => {}} />);
  expect(r.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
  expect(r.getByText('If this keeps happening, close Towinly and start it again.')).toBeTruthy();
});

test('the root layout exports the boundary under the name expo-router looks for', () => {
  // The export is read from the source rather than by importing the layout:
  // importing it would boot every provider in the app, and what is being
  // pinned is the module contract expo-router reads, not the layout's runtime.
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.jsx'), 'utf8');
  expect(source).toMatch(/export\s*\{\s*ErrorFallback as ErrorBoundary\s*\}/);
  expect(source).toMatch(/from '\.\.\/src\/components\/AppErrorBoundary'/);
});
