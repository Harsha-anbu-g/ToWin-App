// The web's replacement for announceForAccessibility (see src/lib/announce.js).
//
// Mounted once, for the whole app life, and empty until something is said —
// screen readers watch a live region for CHANGES, so a region created at the
// same moment as its text is routinely missed. Visually it is a 1×1 clipped
// box rather than opacity: 0, which some browsers treat as hidden from
// assistive technology too.
//
// Native returns null: announceForAccessibility works there, and a second
// spoken copy would be worse than none.
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { setAnnouncer } from '../../lib/announce';
import { fontScaleCaps } from '../../theme/tokens';

export default function LiveRegion() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    return setAnnouncer(setMessage);
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="status"
      style={{ position: 'absolute', width: 1, height: 1, left: -1, overflow: 'hidden' }}
    >
      <Text maxFontSizeMultiplier={fontScaleCaps.body}>{message}</Text>
    </View>
  );
}
