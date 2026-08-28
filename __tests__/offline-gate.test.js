// The offline gate (src/lib/useIsOffline) decides when every screen goes quiet:
// it tells TanStack Query to pause, and the banner says "You're offline".
//
// 2026-08-28: the Radon simulator had run the app for two and a half days, the
// Mac slept with the lid closed, and NetInfo kept reporting "no internet" after
// the wake even though the network was fine (curl from inside the simulator
// reached Railway). The gate believed it, paused every query, and never asked
// again — so all three demo accounts looked empty while the backend held every
// row. These probes pin the rule that closes that hole: the OS's word is taken
// for "online" at once, but "offline" is verified against the API first, and
// while offline the gate keeps checking on its own until the path is proven.
import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import useIsOffline, { OFFLINE_RECHECK_MS } from '../src/lib/useIsOffline';
import { probeApiReachable, setOnResponseSeen } from '../src/api/client';

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);
jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {},
  probeApiReachable: jest.fn(),
  setOnResponseSeen: jest.fn(),
}));

const ONLINE = { isConnected: true, isInternetReachable: true };
const OFFLINE = { isConnected: false, isInternetReachable: false };
// What a long-running simulator reports after the Mac slept: the OS still
// sees a link, its reachability probe never came back.
const STALE = { isConnected: true, isInternetReachable: false };

let netListener;
let appStateListener;
let appStateSpy;

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  NetInfo.addEventListener.mockImplementation((fn) => {
    netListener = fn;
    return jest.fn();
  });
  appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, fn) => {
    appStateListener = fn;
    return { remove: jest.fn() };
  });
  probeApiReachable.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  // Only this spy is restored: restoreAllMocks would also strip the preset's
  // own jest.fn mocks (Jest 29 semantics) and leave the next render inert.
  appStateSpy.mockRestore();
});

// RNTL 14 fills result.current from a passive effect, so it is read only
// once it has landed (same shape as location-freshness.test.js).
const mount = async () => {
  const view = await renderHook(() => useIsOffline());
  await waitFor(() => expect(view.result.current).not.toBeNull());
  return view;
};

test('the OS saying "online" is believed at once, with no probe', async () => {
  const view = await mount();
  await act(async () => {
    netListener(ONLINE);
  });
  expect(view.result.current).toBe(false);
  expect(onlineManager.isOnline()).toBe(true);
  expect(probeApiReachable).not.toHaveBeenCalled();
});

test('the OS saying "offline" is checked against the API before anyone is told', async () => {
  const view = await mount();
  await act(async () => {
    netListener(STALE);
  });
  await waitFor(() => expect(probeApiReachable).toHaveBeenCalledTimes(1));
  // The API answered, so the stale verdict is overruled: no banner, no pause.
  expect(view.result.current).toBe(false);
  expect(onlineManager.isOnline()).toBe(true);
});

test('when the API really cannot be reached, the banner shows and queries pause', async () => {
  probeApiReachable.mockResolvedValue(false);
  const view = await mount();
  await act(async () => {
    netListener(OFFLINE);
  });
  await waitFor(() => expect(view.result.current).toBe(true));
  expect(onlineManager.isOnline()).toBe(false);
});

test('while offline, coming back to the foreground re-checks and recovers', async () => {
  probeApiReachable.mockResolvedValue(false);
  const view = await mount();
  await act(async () => {
    netListener(OFFLINE);
  });
  await waitFor(() => expect(view.result.current).toBe(true));

  probeApiReachable.mockResolvedValue(true);
  await act(async () => {
    appStateListener('active');
  });
  await waitFor(() => expect(view.result.current).toBe(false));
  expect(onlineManager.isOnline()).toBe(true);
});

test('while offline, the gate keeps re-checking on its own', async () => {
  jest.useFakeTimers();
  probeApiReachable.mockResolvedValue(false);
  const view = await mount();
  await act(async () => {
    netListener(OFFLINE);
  });
  await waitFor(() => expect(view.result.current).toBe(true));
  const probesSoFar = probeApiReachable.mock.calls.length;

  probeApiReachable.mockResolvedValue(true);
  await act(async () => {
    jest.advanceTimersByTime(OFFLINE_RECHECK_MS + 1);
  });
  await waitFor(() => expect(view.result.current).toBe(false));
  expect(probeApiReachable.mock.calls.length).toBeGreaterThan(probesSoFar);
});

test('while online, nothing polls the API', async () => {
  jest.useFakeTimers();
  await mount();
  await act(async () => {
    netListener(ONLINE);
  });
  await act(async () => {
    jest.advanceTimersByTime(OFFLINE_RECHECK_MS * 4);
  });
  expect(probeApiReachable).not.toHaveBeenCalled();
});

test('an answer to any API call proves the path is alive', async () => {
  probeApiReachable.mockResolvedValue(false);
  const view = await mount();
  await act(async () => {
    netListener(OFFLINE);
  });
  await waitFor(() => expect(view.result.current).toBe(true));

  // The client calls this hook whenever a response arrives (src/api/client).
  const responseSeen = setOnResponseSeen.mock.calls[0][0];
  await act(async () => {
    responseSeen();
  });
  expect(onlineManager.isOnline()).toBe(true);
  await waitFor(() => expect(view.result.current).toBe(false));
});

test('a slow "unreachable" verdict cannot override a newer "online" signal', async () => {
  let settleProbe;
  probeApiReachable.mockImplementation(
    () =>
      new Promise((resolve) => {
        settleProbe = resolve;
      })
  );
  const view = await mount();
  await act(async () => {
    netListener(STALE);
  });
  await waitFor(() => expect(probeApiReachable).toHaveBeenCalledTimes(1));

  // The OS changes its mind before the probe returns.
  await act(async () => {
    netListener(ONLINE);
  });
  await act(async () => {
    settleProbe(false);
  });
  expect(onlineManager.isOnline()).toBe(true);
  await waitFor(() => expect(view.result.current).toBe(false));
});
