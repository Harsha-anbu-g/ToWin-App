// "Are we offline?" — answered differently on each platform, and told to
// TanStack Query so it pauses rather than burning retries into a dead network.
//
// On a phone NetInfo reads the OS's own connectivity state, and that is the
// right place to START. It is not the last word. On 2026-08-28 a simulator that
// had run the app for two and a half days kept reporting "no internet" after
// the Mac slept with the lid closed, while the network was fine the whole time
// (curl from inside the simulator reached the API). The gate took NetInfo at
// its word, paused every query, and never asked again: all three demo accounts
// looked empty while the backend held every row. A phone can do the same after
// a captive portal or a long sleep. So the rule is now asymmetric:
//
//   • "online" from the OS is believed at once — nothing to verify, and a
//     false banner is worse than none (it stops people trying).
//   • "offline" from the OS is CHECKED against the API before anyone is told:
//     one small probe (src/api/client probeApiReachable). If the server
//     answers, the OS is wrong and the app stays alive.
//   • While offline, the gate keeps re-checking on its own — on every return
//     to the foreground and on a slow timer — so a stale reading can never hold
//     the app hostage until somebody restarts it.
//   • An answer to ANY API call is proof of a live path (client.js reports
//     them), so the moment one request gets through, everything resumes.
//
// TanStack's onlineManager is the single store; the banner mirrors it.
//
// In a browser NetInfo is the WRONG answer. Its web implementation decides
// reachability by fetching a URL, by default the site root. Served under
// towinly.com/app/ that request lands on the MARKETING site, so its result
// says nothing about whether the app's API is reachable — and any hiccup on
// that unrelated page would tell a signed-in elder they are offline when they
// are not. The browser already tracks this itself: navigator.onLine plus the
// online/offline events is a narrower claim — "this device has no network at
// all" — but it is a claim the browser can actually make, and it costs no
// requests.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { probeApiReachable, setOnResponseSeen } from '../api/client';

/** How often, while offline, the gate asks the API again on its own. */
export const OFFLINE_RECHECK_MS = 15_000;

/** @returns {boolean} true while the device has no usable network */
export default function useIsOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const apply = (isOffline) => {
        setOffline(isOffline);
        onlineManager.setOnline(!isOffline); // queries pause offline, retry when back
      };
      // `onLine === false` rather than `!onLine`: an environment that doesn't
      // implement it at all must read as online, never as permanently offline.
      const update = () => apply(window.navigator?.onLine === false);
      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }

    // The banner mirrors the store, so every path that flips the store —
    // NetInfo, a probe, a response arriving — shows and hides it the same way.
    const unsubscribeStore = onlineManager.subscribe((isOnline) => setOffline(!isOnline));
    setOffline(!onlineManager.isOnline());
    setOnResponseSeen(() => onlineManager.setOnline(true));

    // A probe that started before a newer signal arrived must not get to
    // answer: the OS can say "online" while a slow probe is still out, and a
    // late "unreachable" from it would flip the app back off for no reason.
    let generation = 0;
    const verify = async () => {
      const mine = ++generation;
      const reachable = await probeApiReachable();
      if (mine !== generation) return;
      onlineManager.setOnline(reachable);
    };
    const recheckIfOffline = () => {
      if (!onlineManager.isOnline()) verify();
    };

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const claimsOffline = !(state.isConnected && state.isInternetReachable !== false);
      if (!claimsOffline) {
        generation += 1; // retire any probe still in flight
        onlineManager.setOnline(true);
        return;
      }
      verify();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') recheckIfOffline();
    });
    const timer = setInterval(recheckIfOffline, OFFLINE_RECHECK_MS);

    return () => {
      unsubscribeStore();
      unsubscribeNetInfo();
      appState.remove();
      clearInterval(timer);
      setOnResponseSeen(() => {});
    };
  }, []);

  return offline;
}
