// Route by auth state (mirrors the web's PublicRoute/PrivateRoute logic),
// with the first-launch landing story in front (handoff 3o): visitor sees
// the story once, then always lands on Log In; logged-in users go straight
// to their gate (verify-pending / admin / tabs). Waits for the SecureStore
// restore (booted) + the onboarded flag so nothing flashes on cold start.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { entryRouteFor, hasOnboarded } from '../src/lib/onboarding';

export default function Index() {
  const { user, booted } = useAuth();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    hasOnboarded().then(setOnboarded);
  }, []);

  if (!booted || onboarded === null) return null; // splash background holds

  return <Redirect href={entryRouteFor({ user, onboarded })} />;
}
