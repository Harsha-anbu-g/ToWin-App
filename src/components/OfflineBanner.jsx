// Offline banner — a calm strip when the network is gone (HCI rule 1: the app
// always says what's happening). TanStack Query retries when back online.
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { announce } from '../lib/announce';
import useIsOffline from '../lib/useIsOffline';
import { useTheme } from '../theme/ThemeContext';

const MESSAGE = "You're offline. We'll retry as soon as you're back.";

export default function OfflineBanner() {
  const { t, spacing, text } = useTheme();
  const offline = useIsOffline();

  // accessibilityLiveRegion is Android-only; VoiceOver and browser screen
  // readers need an explicit announcement so elders hear that the network
  // dropped (announce() picks the right mechanism per platform).
  useEffect(() => {
    if (offline) announce(MESSAGE);
  }, [offline]);

  if (!offline) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: t.surfaceFill,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[4],
      }}
    >
      <Text style={{ fontSize: text.sm, color: t.inkSlate, textAlign: 'center' }}>{MESSAGE}</Text>
    </View>
  );
}
