// Push notifications, the app half. The server half lives in the website
// backend (com.towinly.notification): this module asks the person's permission,
// registers the phone's Expo token with our server, and opens the right screen
// when a notification is tapped. Three moments ring in v1: a chat message, an
// offer on your help request, your offer being accepted.
//
// expo-notifications is required lazily inside each function: the same bundle
// serves the web build at towinly.com/app/, where the native module does not
// exist and must never be evaluated.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from '../api/notifications';
import * as Store from './storage';
import { KEYS } from './storageKeys';

const isNative = () => Platform.OS !== 'web';

const notifications = () => require('expo-notifications');
const device = () => require('expo-device');

/**
 * Foreground policy, per ping kind (2026-08-16 review, HIGH): a MAIN chat
 * message stays silent while the app is open, because the chat badge and the
 * thread itself already say it, and a banner over the very chat you are
 * reading repeats the screen. Everything else SHOWS a quiet banner even
 * in-app: an offer on your request, your offer accepted, and family-thread
 * activity have no always-visible badge, so suppressing them eats the news.
 * The OS handles lock-screen and background on its own; this governs only
 * the app-open case.
 */
export function setupForegroundHandler() {
  if (!isNative()) return;
  notifications().setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data;
      const quiet = data?.type === 'message' && data?.channel !== 'FAMILY_UPDATES';
      return {
        shouldShowAlert: !quiet,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: !quiet,
        shouldShowList: !quiet,
      };
    },
  });
}

/**
 * Ask once, register the device with our server. Called after sign-in. On the
 * web build and simulators this is a quiet no-op. A refusal is respected and
 * never nagged: the OS remembers the answer and re-asking is its business.
 */
export async function registerForPushAsync() {
  if (!isNative()) return null;
  // Android is deferred with the Play launch, and without FCM configured a
  // token request errors after the permission dialog has already been spent.
  // The one-shot system ask is saved for the build that can honor it
  // (2026-08-16 review). iOS-first, like the launch itself.
  if (Platform.OS === 'android') return null;
  try {
    if (!device().isDevice) return null;
    const Notifications = notifications();

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return null;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ))?.data;
    if (!token) return null;

    await registerPushToken({ token, platform: Platform.OS });
    // Remembered so sign-out can silence exactly this device later.
    await Store.setItemAsync(KEYS.pushToken, token);
    return token;
  } catch {
    // No pings is a degraded state, never a broken one — the app carries on.
    return null;
  }
}

/**
 * Sign-out: this device must stop ringing for the account that just left.
 * The DELETE needs no session: holding the token is the proof, which is what
 * lets an EXPIRED session still silence the phone (2026-08-16 review, HIGH).
 * Order matters: the server goodbye goes first, and the local record is
 * cleared only after it succeeds, so a failed goodbye is retried at the next
 * app start instead of being forgotten.
 */
export async function unregisterPushAsync() {
  if (!isNative()) return;
  try {
    const token = await Store.getItemAsync(KEYS.pushToken);
    if (!token) return;
    await unregisterPushToken(token);
    await Store.deleteItemAsync(KEYS.pushToken);
  } catch {
    // Kept locally, retried by PushRegistrar on the next signed-out boot. The
    // server also drops dead tokens on its own (DeviceNotRegistered), so even
    // a phone that never comes back cannot ring forever.
  }
}

/** Where each kind of ping leads. Exported for the tests. */
// App-icon badge = unread conversations (owner call 2026-08-17: Apple
// behavior everywhere). Callers pass the count; web has no icon to badge.
export async function setAppBadgeCountAsync(count) {
  if (Platform.OS === 'web') return;
  try {
    await notifications().setBadgeCountAsync(Math.max(0, Number(count) || 0));
  } catch {
    // Badging is a nicety — never let it break the caller.
  }
}

export function routeForNotification(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.type === 'message' && data.connectionId) {
    // FAMILY_UPDATES rides the same thread screen; the channel param selects it.
    return data.channel === 'FAMILY_UPDATES'
      ? `/chat/${data.connectionId}?channel=FAMILY_UPDATES`
      : `/chat/${data.connectionId}`;
  }
  if (data.type === 'need') return '/my-requests';
  if (data.type === 'need_accepted') return '/my-jobs';
  return null;
}

const openResponse = (router, response) => {
  const path = routeForNotification(
    response?.notification?.request?.content?.data
  );
  if (path) router.push(path);
};

/**
 * The queries a ping refreshes, by kind. The news must be visible the moment
 * the banner is: a message bumps the Messages count, an offer the Posted
 * Help count, an accepted offer the My Elders list — the new elder and the
 * blue badge on their row and tab (owner call 2026-08-31: "even in the
 * helper's account, My Elders should show a blue color when it gets a
 * notification"). Exported for the tests.
 * @param {object | undefined} data  the notification's data payload
 * @returns {Array<string[]>} react-query keys to invalidate; [] for unknown kinds
 */
export function queryKeysForNotification(data) {
  if (!data || typeof data !== 'object') return [];
  if (data.type === 'message') return [['unread-count']];
  if (data.type === 'need') return [['needs-mine'], ['needs-open']];
  if (data.type === 'need_accepted') return [['connections'], ['needs-applications']];
  return [];
}

/**
 * A ping landing while the app is OPEN refreshes the screens it is about.
 * Without this the banner showed but the data behind it sat stale: the
 * helper's My Elders page kept its 30s-old list and the blue new-activity
 * badge only appeared after a pull or an app switch. Background arrivals
 * need no listener — coming back to the app refetches through focusManager
 * (root layout). Wired once at the root, beside the tap listener.
 * @param {{ invalidateQueries: Function }} queryClient  the app's query client
 * @returns {() => void} unsubscribe
 */
export function wireNotificationRefresh(queryClient) {
  if (!isNative()) return () => {};
  const sub = notifications().addNotificationReceivedListener((notification) => {
    const keys = queryKeysForNotification(notification?.request?.content?.data);
    for (const queryKey of keys) queryClient.invalidateQueries({ queryKey });
  });
  return () => sub.remove();
}

/**
 * Tapping a notification while the app runs opens the screen it is about:
 * the chat thread, your help request's applicants, or your jobs. Wired once
 * at the root.
 */
export function wireNotificationTaps(router) {
  if (!isNative()) return () => {};
  const sub = notifications().addNotificationResponseReceivedListener(
    (response) => openResponse(router, response)
  );
  return () => sub.remove();
}

/**
 * The tap that LAUNCHED the app from cold, answered exactly once, and only
 * after auth has booted (2026-08-16 review): routing into the chat before
 * the restored session exists fires its queries tokenless and strands the
 * screen. PushRegistrar calls this when booted turns true.
 */
export async function answerColdStartTapAsync(router) {
  if (!isNative()) return;
  try {
    const response = await notifications().getLastNotificationResponseAsync?.();
    if (response) openResponse(router, response);
  } catch {
    // No cold-start tap to answer is the common case, never an error.
  }
}
