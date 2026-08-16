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
import api from '../api/client';
import * as Store from './storage';
import { KEYS } from './storageKeys';

const isNative = () => Platform.OS !== 'web';

const notifications = () => require('expo-notifications');
const device = () => require('expo-device');

/**
 * While the app is OPEN, stay silent: every ping-worthy moment already shows
 * as an in-app badge, and a banner on top of the very chat you are reading
 * would say what the screen already says. The OS shows lock-screen and
 * background notifications on its own; this handler only governs foreground.
 */
export function setupForegroundHandler() {
  if (!isNative()) return;
  notifications().setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

/**
 * Ask once, register the device with our server. Called after sign-in. On the
 * web build and simulators this is a quiet no-op. A refusal is respected and
 * never nagged: the OS remembers the answer and re-asking is its business.
 */
export async function registerForPushAsync() {
  if (!isNative()) return null;
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

    await api.post('/notifications/token', { token, platform: Platform.OS });
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
 * The JWT is passed in by the caller because logout clears the shared token
 * getter before this request would leave. Fire-and-forget by design.
 */
export async function unregisterPushAsync(jwt) {
  if (!isNative()) return;
  try {
    const token = await Store.getItemAsync(KEYS.pushToken);
    if (!token) return;
    await Store.deleteItemAsync(KEYS.pushToken);
    await api.delete('/notifications/token', {
      data: { token },
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    });
  } catch {
    // The server drops dead tokens on its own (DeviceNotRegistered), so a
    // failed goodbye here cannot leave the phone ringing forever.
  }
}

/** Where each kind of ping leads. Exported for the tests. */
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

/**
 * Tapping a notification opens the screen it is about: the chat thread, your
 * help request's applicants, or your jobs. Wired once at the root. Also
 * answers the cold start, where the tap happened before the app was running.
 */
export function wireNotificationTaps(router) {
  if (!isNative()) return () => {};
  const Notifications = notifications();

  const open = (response) => {
    const path = routeForNotification(
      response?.notification?.request?.content?.data
    );
    if (path) router.push(path);
  };

  // The tap that launched the app from cold, delivered exactly once.
  Notifications.getLastNotificationResponseAsync?.()
    .then((response) => response && open(response))
    .catch(() => {});

  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
