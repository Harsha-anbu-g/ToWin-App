// Calm toast — bottom card on the parchment, auto-dismiss (4s), announced politely
// to screen readers. One toast at a time; new replaces old (elders: one idea at a time).
//
// Rulebook pass 2026-07-27: the capsule now clears the tab bar + home indicator
// (it used a fixed bottom and covered the FAB and pinned buttons on notched
// phones), and it can carry ONE action ("Undo") — the undo-over-confirm rule
// needs somewhere for the undo to live.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { announce } from '../lib/announce';
import { haptic } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { tabBarSpace } from '../lib/tabBarMetrics';

const ToastContext = createContext(null);

// The toast floats above the tab bar's band (shared tabBarMetrics — a
// floating capsule on iOS); non-tab screens have no bar, but the constant
// clearance keeps the toast in one place instead of jumping between screens.

export function ToastProvider({ children }) {
  const { t, spacing, radius, text } = useTheme();
  const insets = useSafeAreaInsets();
  // { message, type: 'info'|'success'|'error', actionLabel?, onAction? }
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type, ...options });
    // Task outcomes carry a haptic (rulebook §11) — fired here, once, so every
    // success/error across the app has the same physical signature. Info stays
    // silent: restraint is the budget.
    if (type === 'success') haptic.success();
    else if (type === 'error') haptic.error();
    // accessibilityLiveRegion only speaks on Android — VoiceOver and browser
    // screen readers need an explicit announcement, or those elders never hear
    // "sent" / "saved" / errors (announce() picks the right one per platform).
    announce(message);
    // A toast carrying an action needs longer on screen — the person has to
    // read it AND decide; 4s is the no-decision case.
    const ttl = options.actionLabel ? 6000 : 4000;
    timer.current = setTimeout(() => setToast(null), ttl);
  }, []);

  // Clear the pending timer on unmount — otherwise it fires setState on a dead tree
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Stable value — a fresh object here would re-render every useToast()
  // consumer (the whole app) each time a toast appears or clears.
  const value = useMemo(() => ({ showToast }), [showToast]);

  const runAction = () => {
    if (timer.current) clearTimeout(timer.current);
    const act = toast?.onAction;
    setToast(null);
    act?.();
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        // One neutral capsule for every type (the message carries the meaning) —
        // the quiet dark pill every modern app uses. Ink flips with the theme,
        // so it stays a dark pill by day and a light pill at night.
        // box-none: the wrapper never eats touches; only the pill itself does,
        // and only when it carries an action.
        <View
          pointerEvents="box-none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: tabBarSpace(insets) + spacing[4],
            alignItems: 'center',
          }}
        >
          <View
            pointerEvents={toast.actionLabel ? 'auto' : 'none'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              maxWidth: '86%',
              backgroundColor: t.ink,
              borderRadius: radius.pill,
              paddingHorizontal: spacing[5],
              paddingVertical: 12,
              gap: spacing[3],
            }}
          >
            <Text
              style={{
                color: t.surface,
                fontSize: text.sm,
                lineHeight: 21,
                textAlign: 'center',
                flexShrink: 1,
              }}
            >
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.actionLabel}
                onPress={runAction}
                // DEEP-08: a real box, not a bare word — react-native-web drops
                // hitSlop, so the Pressable itself must carry the target. 40 is
                // the sanctioned compact height (Button.jsx quiet variants).
                hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
                style={({ pressed }) => ({
                  minHeight: 40,
                  paddingHorizontal: spacing[2],
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: t.actionOnInk, fontSize: text.sm, fontWeight: '600' }}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
