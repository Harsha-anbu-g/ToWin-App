// Offline banner — a calm strip when the network is gone (HCI rule 1: the app
// always says what's happening). TanStack Query retries when back online.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function OfflineBanner() {
  const { t, spacing, text } = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !(state.isConnected && state.isInternetReachable !== false);
      setOffline(isOffline);
      onlineManager.setOnline(!isOffline); // queries pause offline, retry when back
    });
    return unsub;
  }, []);

  // accessibilityLiveRegion is Android-only; VoiceOver needs an explicit
  // announcement so iOS elders hear that the network dropped.
  useEffect(() => {
    if (offline && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility("You're offline — we'll retry as soon as you're back.");
    }
  }, [offline]);

  if (!offline) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: t.amberWash,
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[4],
      }}
    >
      <Text style={{ fontSize: text.sm, color: t.amberDeep, textAlign: 'center' }}>
        You're offline — we'll retry as soon as you're back.
      </Text>
    </View>
  );
}
