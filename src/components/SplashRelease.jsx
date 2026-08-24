// Renders nothing. Lets the native launch screen go the moment the session
// restore finishes. It sits inside FontGate, so by the time it mounts the
// serif is in, and inside AuthProvider, so `booted` is the last thing the
// first screen waits for — the route paints in the same commit this fires.
// Placed in the root layout, not the index route, so a deep link or a
// notification tap (which never render index) can't leave the splash up.
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { releaseSplash } from '../lib/splash';

export default function SplashRelease() {
  const { booted } = useAuth();
  useEffect(() => {
    if (booted) releaseSplash();
  }, [booted]);
  return null;
}
