// Renders nothing. Sits once at the root and does five things: keeps the
// foreground policy (silent for chat messages, a quiet banner for the pings
// no badge covers), refreshes the queries a foreground ping is about (so the
// blue badges answer the banner), registers this device when someone signs
// in, answers a cold-start notification tap once auth has booted, and
// retries a failed sign-out goodbye on the next signed-out start. Sign-OUT
// itself fires from AuthContext.logout.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  answerColdStartTapAsync,
  registerForPushAsync,
  setupForegroundHandler,
  unregisterPushAsync,
  wireNotificationRefresh,
  wireNotificationTaps,
} from '../lib/pushNotifications';

export default function PushRegistrar() {
  const { user, booted } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    setupForegroundHandler();
    return wireNotificationTaps(router);
  }, [router]);

  // A ping arriving while the app is open refreshes what it is about, so the
  // lists and blue badges answer the banner instead of sitting stale.
  useEffect(() => wireNotificationRefresh(queryClient), [queryClient]);

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
