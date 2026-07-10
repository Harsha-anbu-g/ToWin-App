// Calm toast — bottom card on the parchment, auto-dismiss (4s), announced politely
// to screen readers. One toast at a time; new replaces old (elders: one idea at a time).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t, spacing, radius, text } = useTheme();
  const [toast, setToast] = useState(null); // { message, type: 'info' | 'success' | 'error' }
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Clear the pending timer on unmount — otherwise it fires setState on a dead tree
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const colors = {
    info: { border: t.skyLine, bg: t.blueWash, fg: t.blueDeep },
    success: { border: t.greenLine, bg: t.greenWash, fg: t.greenDeep },
    error: { border: t.redLine, bg: t.redTint, fg: t.redError },
  }[toast?.type ?? 'info'];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: spacing[5],
            right: spacing[5],
            bottom: spacing[12],
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          }}
        >
          <Text style={{ color: colors.fg, fontSize: text.base, textAlign: 'center' }}>
            {toast.message}
          </Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
