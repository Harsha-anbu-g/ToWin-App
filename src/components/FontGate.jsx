// Holds the app back until the Newsreader serif is ready — headings are the
// brand voice and must never flash in a fallback face.
//
// Two escape hatches, because a stuck first screen is worse than an imperfect
// one. The font loader's own error is the first (already true before this
// component existed). The second is time: on the web the fonts are fetched over
// the network, and a slow or blocked CDN would otherwise leave the person
// staring at a placeholder forever. After FONT_TIMEOUT_MS the app renders in the
// system fallback and swaps to the serif whenever it arrives.
import { useEffect, useState } from 'react';
import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import BootScreen from './ui/BootScreen';

// Long enough that a normal connection never sees the fallback face; short
// enough that a broken one is not mistaken for a frozen app.
export const FONT_TIMEOUT_MS = 2500;

export default function FontGate({ children }) {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
  });
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setWaitedLongEnough(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  if (fontsLoaded || fontError || waitedLongEnough) return children;
  return <BootScreen />;
}
