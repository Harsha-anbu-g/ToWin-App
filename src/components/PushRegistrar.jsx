// Renders nothing. Sits once at the root and does three things: keeps the
// foreground handler quiet (in-app badges already speak), registers this
// device for pings when someone signs in, and opens the right screen when a
// notification is tapped. Sign-OUT is handled in AuthContext.logout, which
// still holds the JWT this component would already have lost.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushAsync,
  setupForegroundHandler,
  wireNotificationTaps,
} from '../lib/pushNotifications';

export default function PushRegistrar() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setupForegroundHandler();
    return wireNotificationTaps(router);
  }, [router]);

  useEffect(() => {
    // Keyed on the userId: a sign-in (or a switch to another account on the
    // same phone) re-registers, and the upsert on the server moves the device
    // to whoever is signed in now.
    if (user?.userId) registerForPushAsync();
  }, [user?.userId]);

  return null;
}
