// Owner call 2026-09-04: a phone opening towinly.com/app in Chrome should see
// the iOS app, not a web port. Four seams where react-native-web used to show
// its own hand — pinned so they stay closed:
//
//   the pull      — a phone browser refreshes by pulling, like the iPhone;
//                   only a screen with nothing to pull with keeps the link
//   the switch    — sized like Apple's, white knob both ways
//   the lens      — the browser's glass draws its own rim, never the blue wash
//   the shell     — no long-press callout, no label selection, no page
//                   rubber-band, no autofill wash
//
// Everything web-specific is driven through jest.replaceProperty(Platform,
// 'OS', ...) — the house pattern from ui-web-parity.test.js.
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';
import fs from 'fs';
import path from 'path';
import { ThemeProvider } from '../src/theme/ThemeContext';
import RefreshControl, { PULL_THRESHOLD } from '../src/components/ui/RefreshControl';
import Switch, { WEB_SWITCH_SIZE } from '../src/components/ui/Switch';
import GlassLens from '../src/components/ui/GlassLens';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

// A touch screen, the way a phone browser reports one.
const withTouch = () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(globalThis.navigator ?? {}), maxTouchPoints: 5 },
    configurable: true,
    writable: true,
  });
  return () => {
    if (had) Object.defineProperty(globalThis, 'navigator', had);
    else delete globalThis.navigator;
  };
};

const touch = (clientY) => ({ nativeEvent: { touches: [{ clientY }] } });

describe('the pull: a phone browser refreshes the way the iPhone does', () => {
  let restore;
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    restore = withTouch();
  });
  afterEach(() => restore());

  // RNTL 14: every fireEvent is an act() and must be awaited, or the state it
  // sets never lands before the next touch.
  const pull = async (host, distance) => {
    await fireEvent(host, 'touchStart', touch(100));
    await fireEvent(host, 'touchMove', touch(100 + distance));
    await fireEvent(host, 'touchEnd', {});
  };

  test('a full pull from the top runs the reload once, with no Refresh link in sight', async () => {
    const reload = jest.fn();
    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );
    expect(r.queryByText('Refresh')).toBeNull();
    await pull(r.getByText('the list').parent, PULL_THRESHOLD + 8);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(r.getByText('the list')).toBeTruthy();
  });

  test('a short pull lets go without reloading', async () => {
    const reload = jest.fn();
    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );
    await pull(r.getByText('the list').parent, PULL_THRESHOLD - 20);
    expect(reload).not.toHaveBeenCalled();
  });

  test('while a reload runs the spinner band shows and a second pull cannot stack another', async () => {
    const reload = jest.fn();
    const r = await wrap(
      <RefreshControl refreshing onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );
    expect(r.getByLabelText('Refreshing')).toBeTruthy();
    await pull(r.getByText('the list').parent, PULL_THRESHOLD + 40);
    expect(reload).not.toHaveBeenCalled();
  });

  test('a screen with nothing to pull with keeps the Refresh link', async () => {
    restore();
    restore = () => {};
    const reload = jest.fn();
    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );
    await fireEvent.press(r.getByRole('button', { name: 'Refresh' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('the switch', () => {
  test("in the browser it is sized like Apple's, white knob in both states", async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const r = await wrap(<Switch accessibilityLabel="Night mode" value onValueChange={() => {}} />);
    // Read at the host: RN's Switch renames thumbColor to thumbTintColor on
    // its way down and forwards what it does not know (activeThumbColor).
    const host = r.getByLabelText('Night mode');
    expect(StyleSheet.flatten(host.props.style)).toMatchObject(WEB_SWITCH_SIZE);
    expect(host.props.thumbTintColor).toBe('#ffffff');
    expect(host.props.activeThumbColor).toBe('#ffffff');
  });

  test('on a phone it is the platform switch, untouched', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const r = await wrap(<Switch accessibilityLabel="Night mode" value onValueChange={() => {}} />);
    const host = r.getByLabelText('Night mode');
    expect(StyleSheet.flatten(host.props.style).width).toBeUndefined();
    expect(host.props.thumbTintColor).toBeUndefined();
    expect(host.props.activeThumbColor).toBeUndefined();
  });
});

describe('the lens', () => {
  test('the web build reads the platform at import: no rim layer under Jest, which runs as iOS', async () => {
    const r = await wrap(<GlassLens tint="light" washColor="#ffffff" />);
    expect(r.queryByTestId('glass-rim')).toBeNull();
  });
});

describe('the web shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const css = html.replace(/\/\*[\s\S]*?\*\//g, '');

  test('labels cannot be selected or long-pressed into a callout, fields still can', () => {
    expect(css).toMatch(/body\s*{[^}]*-webkit-touch-callout:\s*none/);
    expect(css).toMatch(/body\s*{[^}]*user-select:\s*none/);
    expect(css).toMatch(/input,\s*textarea\s*{[^}]*user-select:\s*text/);
  });

  test('the page never rubber-bands or reloads on a pull; the list handles the pull', () => {
    expect(css).toMatch(/overscroll-behavior:\s*none/);
  });

  test("Chrome's autofill wash stays out of the fields", () => {
    expect(css).toMatch(/input:-webkit-autofill/);
  });
});
