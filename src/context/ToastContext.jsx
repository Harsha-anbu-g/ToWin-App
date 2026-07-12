// Calm toast — bottom card on the parchment, auto-dismiss (4s), announced politely
// to screen readers. One toast at a time; new replaces old (elders: one idea at a time).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t, spacing, radius } = useTheme();
  const [toast, setToast] = useState(null); // { message, type: 'info' | 'success' | 'error' }
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    // accessibilityLiveRegion only speaks on Android — VoiceOver needs an
    // explicit announcement, or iOS elders never hear "sent" / "saved" / errors.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Clear the pending timer on unmount — otherwise it fires setState on a dead tree
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Stable value — a fresh object here would re-render every useToast()
  // consumer (the whole app) each time a toast appears or clears.
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        // One neutral capsule for every type (the message carries the meaning) —
        // the quiet dark pill every modern app uses. Ink flips with the theme,
        // so it stays a dark pill by day and a light pill at night.
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: spacing[12] + spacing[4],
            alignItems: 'center',
          }}
        >
          <View
            style={{
              maxWidth: '86%',
              backgroundColor: t.ink,
              borderRadius: radius.pill,
              paddingHorizontal: spacing[5],
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: t.surface, fontSize: 15, lineHeight: 20, textAlign: 'center' }}>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
