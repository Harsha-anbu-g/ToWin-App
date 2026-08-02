// "Are we offline?" — answered differently on each platform, and told to
// TanStack Query so it pauses rather than burning retries into a dead network.
//
// On a phone NetInfo is the right answer: it reads the OS's own connectivity
// state.
//
// In a browser it is the WRONG answer. NetInfo's web implementation decides
// reachability by fetching a URL, by default the site root. Served under
// towinly.com/app/ that request lands on the MARKETING site, so its result
// says nothing about whether the app's API is reachable — and any hiccup on
// that unrelated page would tell a signed-in elder they are offline when they
// are not. A false "You're offline" is worse than no banner: it stops people
// trying.
//
// The browser already tracks this itself. navigator.onLine plus the online/
// offline events is a narrower claim — "this device has no network at all" —
// but it is a claim the browser can actually make, and it costs no requests.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** @returns {boolean} true while the device has no usable network */
export default function useIsOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const apply = (isOffline) => {
      setOffline(isOffline);
      onlineManager.setOnline(!isOffline); // queries pause offline, retry when back
    };

    if (Platform.OS === 'web') {
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

    return NetInfo.addEventListener((state) =>
      apply(!(state.isConnected && state.isInternetReachable !== false))
    );
  }, []);

  return offline;
}
