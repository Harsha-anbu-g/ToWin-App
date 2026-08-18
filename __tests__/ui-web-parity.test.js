// Deep audit 2026-08-11, the "ui-web-parity" group. Towinly ships one codebase
// to the App Store and to towinly.com/app/, and react-native-web quietly drops
// props the phone build honours. Five defects, all from that one seam:
//
//   DEEP-07  pull-to-refresh is a silent no-op in the browser
//   DEEP-08  hitSlop does not exist on web, so 44pt targets shrink to 34-36pt
//   DEEP-31  the "Vibration feedback" switch is offered where nothing vibrates
//   DEEP-33  FirstTimeCard sets reading copy at 14pt under a sans-serif title
//   DEEP-35  Peekaboo cells are neither focusable nor keyboard-operable on web
//
// Everything web-specific is driven through jest.replaceProperty(Platform,
// 'OS', ...) — the house pattern from google-login-button.test.js.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { fontFamily, type } from '../src/theme/tokens';
import RefreshControl from '../src/components/ui/RefreshControl';
import SegmentedControl from '../src/components/ui/SegmentedControl';
import FirstTimeCard from '../src/components/ui/FirstTimeCard';
import { svgButtonA11y } from '../src/lib/svgA11y';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'u1', emailVerified: true }, booted: true }),
}));

// FirstTimeCard reads a "seen" flag before it shows itself; an unset flag is
// the first-visit case this suite is about.
jest.mock('../src/lib/storage', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

import api from '../src/api/client';
import ProfileScreen from '../app/(tabs)/profile';

// Owner call 2026-08-17 (normal density): the visual box floor is 36pt —
// ordinary app chip height. The box must still be real (measured minHeight,
// never hitSlop, because react-native-web drops hitSlop).
const MIN_TARGET = 36;

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Real feed shapes for the Profile tab — /connections is filtered as an array.
const PROFILE_FEEDS = {
  '/profile/me': { name: 'Margaret', city: 'Montreal' },
  '/trust/my-score': { totalScore: 15 },
  '/connections': [],
  '/streaks/me': {},
  '/reviews/mine': [],
};

beforeEach(() => {
  api.get.mockImplementation(async (url) => ({ data: PROFILE_FEEDS[url] ?? {} }));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// DEEP-07 — pull-to-refresh is a silent no-op on web
//
// react-native-web's RefreshControl destructures onRefresh and refreshing and
// throws both away, then renders a plain View
// (node_modules/react-native-web/dist/exports/RefreshControl/index.js). The
// gesture cannot be implemented on top of that, so the browser build must stop
// pretending: it offers a visible control that runs the same reload. RNW's
// ScrollView clones the refresh control AROUND the scroller
// (dist/exports/ScrollView/index.js: cloneElement(refreshControl, {style},
// scrollView)), which is why the web branch has to render its children.
// ---------------------------------------------------------------------------
describe('DEEP-07: refreshing on the web build', () => {
  test('offers a real control that runs the same reload the pull would', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const reload = jest.fn();

    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );

    await fireEvent.press(r.getByRole('button', { name: 'Refresh' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('keeps the list it wraps on screen', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={() => {}}>
        <Text>the list</Text>
      </RefreshControl>
    );
    expect(r.getByText('the list')).toBeTruthy();
  });

  test('says it is working, and a second tap cannot stack another reload', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const reload = jest.fn();
    const r = await wrap(
      <RefreshControl refreshing onRefresh={reload}>
        <Text>the list</Text>
      </RefreshControl>
    );

    const button = r.getByRole('button', { name: /Refreshing/ });
    await fireEvent.press(button);
    expect(reload).not.toHaveBeenCalled();
  });

  test('on a phone nothing changes: the platform gesture, no button', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const r = await wrap(
      <RefreshControl refreshing={false} onRefresh={() => {}}>
        <Text>the list</Text>
      </RefreshControl>
    );
    // The real control is still mounted (the host swallows props and children
    // under Jest, so its identity is all there is to read here).
    expect(r.toJSON().type).toBe('RCTRefreshControl');
    expect(r.queryByText('Refresh')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DEEP-08 — hitSlop is dropped by react-native-web, so a target that exists
// only as slop does not exist at all at towinly.com/app/. Both controls here
// leaned on it: the segmented control (34pt visual + 5pt slop) and the Edit
// profile pill (36pt + 6pt). The pin is a measured box, the same contract
// tap-target-offer-help.test.js writes.
// ---------------------------------------------------------------------------
describe('DEEP-08: targets that survive the web build', () => {
  const SEGMENTS = [
    { key: 'open', label: 'Looking for Help', count: 2 },
    { key: 'progress', label: 'In Progress', count: 1 },
  ];

  test('every segment of the filter control is a real 44pt box', async () => {
    const r = await render(
      <ThemeProvider>
        <SegmentedControl segments={SEGMENTS} value="open" onChange={() => {}} />
      </ThemeProvider>
    );

    for (const seg of SEGMENTS) {
      const tab = r.getByRole('tab', { name: new RegExp(seg.label) });
      expect(styleOf(tab).minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });

  test('the segment still changes the filter when tapped', async () => {
    const onChange = jest.fn();
    const r = await render(
      <ThemeProvider>
        <SegmentedControl segments={SEGMENTS} value="open" onChange={onChange} />
      </ThemeProvider>
    );
    await fireEvent.press(r.getByRole('tab', { name: /In Progress/ }));
    expect(onChange).toHaveBeenCalledWith('progress');
  });

  test('the Edit profile pill is a real 44pt box', async () => {
    const r = await wrap(<ProfileScreen />);
    const edit = await waitFor(() => r.getByLabelText('Edit profile'));
    expect(styleOf(edit).minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// DEEP-31 — expo-haptics has no web implementation and src/lib/haptics.js
// hard-returns on Platform.OS === 'web', so the switch controls nothing there.
// The night-mode row directly above it does work, which makes the dead one
// read as broken.
// ---------------------------------------------------------------------------
describe('DEEP-31: the vibration switch', () => {
  test('is not offered in the browser, where nothing can vibrate', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const r = await wrap(<ProfileScreen />);
    await waitFor(() => expect(r.getByText('Night mode')).toBeTruthy());
    expect(r.queryByText('Vibration feedback')).toBeNull();
  }, 30_000);

  test('is still there on a phone, where it does something', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const r = await wrap(<ProfileScreen />);
    await waitFor(() => expect(r.getByText('Vibration feedback')).toBeTruthy());
  }, 30_000);
});

// ---------------------------------------------------------------------------
// DEEP-33 — the card that teaches a feature to someone meeting it for the
// first time was the one card set below the 16pt reading floor, under a
// sans-serif bold title while every other card title is Newsreader 400.
// ---------------------------------------------------------------------------
describe('DEEP-33: the first-visit explainer', () => {
  const BODY =
    "One tap on \"I'm here today\" tells your trusted people you're okay. Skipping a day is fine.";

  const showCard = () =>
    render(
      <ThemeProvider>
        <FirstTimeCard flag="towin-seen-checkin" title="What check-in does" body={BODY} />
      </ThemeProvider>
    );

  test('the explaining copy sits at the 16pt reading floor', async () => {
    const r = await showCard();
    const body = await waitFor(() => r.getByText(BODY));
    expect(styleOf(body).fontSize).toBe(type.body);
  });

  test('the title is the serif card title, weight 400 only', async () => {
    const r = await showCard();
    const title = await waitFor(() => r.getByText('What check-in does'));
    const style = styleOf(title);
    expect(style.fontFamily).toBe(fontFamily.display);
    expect(style.fontSize).toBe(type.cardTitle);
    expect(style.fontWeight).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// DEEP-35 — the twelve Peekaboo cells are SVG polygons. accessibilityRole
// "button" is withheld on web on purpose: react-native-web swaps the tag for
// an HTML <button>, which inside an <svg> paints nothing (the cells vanished
// that way on 2026-08-02). The cost was that the cells were also left out of
// the tab order with no keyboard activation, so the game is unplayable without
// a mouse. Focus and key handling do not need the role, so they come back.
// ---------------------------------------------------------------------------
describe('DEEP-35: Peekaboo cells on the web build', () => {
  test('a cell is in the tab order', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const props = svgButtonA11y('Hidden cell');
    expect(props.tabIndex).toBe(0);
    expect(props.accessibilityLabel).toBe('Hidden cell');
    // The role must still be withheld — it is what made the cells invisible.
    expect(props.accessibilityRole).toBeUndefined();
  });

  test('Enter and Space flip the cell the way a click does', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    // The browser's constructor: an SVG element has no .click(), so activation
    // is a dispatched click — the same event react-native-svg maps onPress to.
    global.MouseEvent = class {
      constructor(eventType, init) {
        this.type = eventType;
        Object.assign(this, init);
      }
    };

    for (const key of ['Enter', ' ']) {
      const dispatchEvent = jest.fn();
      const preventDefault = jest.fn();
      svgButtonA11y('Hidden cell').onKeyDown({ key, preventDefault, currentTarget: { dispatchEvent } });

      expect(preventDefault).toHaveBeenCalled(); // Space must not scroll the page
      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      expect(dispatchEvent.mock.calls[0][0]).toMatchObject({ type: 'click', bubbles: true });
    }

    delete global.MouseEvent;
  });

  test('any other key is left alone, so typing never flips a cell', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const dispatchEvent = jest.fn();
    const preventDefault = jest.fn();
    svgButtonA11y('Hidden cell').onKeyDown({ key: 'a', preventDefault, currentTarget: { dispatchEvent } });
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  test('a phone keeps the full button semantics and none of the web props', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(svgButtonA11y('Hidden cell')).toEqual({
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: 'Hidden cell',
    });
  });
});

