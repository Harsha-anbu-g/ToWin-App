// Renders nothing. Sits once at the root and does four things: keeps the
// foreground policy (silent for chat messages, a quiet banner for the pings
// no badge covers), registers this device when someone signs in, answers a
// cold-start notification tap once auth has booted, and retries a failed
// sign-out goodbye on the next signed-out start. Sign-OUT itself fires from
// AuthContext.logout.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  answerColdStartTapAsync,
  registerForPushAsync,
  setupForegroundHandler,
  unregisterPushAsync,
  wireNotificationTaps,
} from '../lib/pushNotifications';

export default function PushRegistrar() {
  const { user, booted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setupForegroundHandler();
    return wireNotificationTaps(router);
  }, [router]);

  // The tap that launched the app waits for the session to restore, so the
  // screen it opens can actually load (cold start races auth boot otherwise).
  useEffect(() => {
    if (booted && user?.userId) answerColdStartTapAsync(router);
  }, [booted, user?.userId, router]);

  useEffect(() => {
    // Keyed on the userId: a sign-in (or a switch to another account on the
    // same phone) re-registers, and the upsert on the server moves the device
    // to whoever is signed in now.
    if (user?.userId) registerForPushAsync();
  }, [user?.userId]);

  useEffect(() => {
    // Signed-out start: if a previous goodbye failed (dead network at
    // logout), the token is still stored locally. Finish the job now; a
    // clean state makes this a no-op.
    if (booted && !user) unregisterPushAsync();
  }, [booted, user]);

  return null;
}
