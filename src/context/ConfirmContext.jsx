// Confirm gate — the one "are you sure?" surface for the whole app.
//
// Replaces Alert.alert everywhere. Two reasons, and the first one is a bug:
//
//   1. react-native-web implements Alert as `static alert() {}` — a literal
//      no-op. Every gate in this app is confirm-then-act, with the real work
//      inside a button's onPress, so in a browser the dialog never appeared and
//      Log out / SOS / delete account / block / report / AI consent silently did
//      nothing. The AI consent gate was worse than silent: it awaited a promise
//      that could never settle, so Send hung forever.
//   2. Alert renders outside the React tree, so no test could ever press its
//      buttons. This one renders in-tree and is asserted in confirm.test.js.
//
// One dialog on ALL platforms, not a web/native split: consistency (HCI rule 4),
// and it keeps the rulebook's verb-labelled buttons instead of the OS's bare
// "OK/Cancel". Structure mirrors LegalModal (Modal + scrim + reduced motion).
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Button from '../components/ui/Button';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const reducedMotion = useReducedMotion();
  // { title, message?, cancelLabel?, confirmLabel?, destructive? } | null
  const [request, setRequest] = useState(null);
  // Held in a ref, not state: settle() must reach the CURRENT promise even when
  // it fires from a callback closed over an older render.
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    // One idea at a time (HCI rule 8). A second request while one is open would
    // either stack dialogs or — worse — leave its caller awaiting forever, which
    // is exactly the hang this component exists to remove. Refuse it instead.
    if (resolver.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setRequest(options);
    });
  }, []);

  const settle = useCallback((answer) => {
    const resolve = resolver.current;
    resolver.current = null;
    setRequest(null);
    resolve?.(answer);
  }, []);

  // Stable value — a fresh object here would re-render every useConfirm()
  // consumer on each open and close.
  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? (
        <Modal
          testID="confirm-modal"
          visible
          transparent
          statusBarTranslucent
          navigationBarTranslucent
          animationType={reducedMotion ? 'none' : 'fade'}
          // Android hardware back and web Escape both land here. Without it an
          // elder can be stuck in a dialog with no obvious way out.
          onRequestClose={() => settle(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', padding: spacing[5] }}>
            {/* The dimmed backdrop is itself a way out, same as LegalModal —
                cancelling must always be the cheapest thing to do. It carries
                no accessibility role on purpose: the card below is
                accessibilityViewIsModal, so a screen reader never reaches the
                backdrop, and announcing a second unlabelled "button" behind the
                dialog would be noise. Screen-reader users exit via Cancel or
                hardware back, both of which are announced. */}
            <Pressable
              testID="confirm-scrim"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onPress={() => settle(false)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: t.scrim,
              }}
            />
            <View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={{
                // maxWidth so the card stays a card on a desktop browser: RN's
                // Modal portals to a viewport-sized overlay on web, outside the
                // 560pt AppFrame column that constrains everything else.
                width: '100%',
                maxWidth: 480,
                alignSelf: 'center',
                backgroundColor: t.canvas,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: t.border,
                padding: spacing[5],
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
              >
                {request.title}
              </Text>
              {request.message ? (
                <Text
                  style={{
                    fontSize: text.sm,
                    color: t.inkSlate2,
                    lineHeight: 22,
                    marginTop: spacing[3],
                  }}
                >
                  {request.message}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: spacing[2],
                  marginTop: spacing[5],
                }}
              >
                {/* Cancel left, confirm right — matches iOS and the website. */}
                <Button
                  title={request.cancelLabel ?? 'Cancel'}
                  variant="text"
                  onPress={() => settle(false)}
                />
                {/* Deliberately never variant="primary": the screen behind the
                    scrim still owns the one filled sky pill (HCI rule 8), and
                    destructive must not wear an ordinary action's shape. */}
                <Button
                  title={request.confirmLabel ?? 'Continue'}
                  variant={request.destructive ? 'destructive' : 'secondary'}
                  onPress={() => settle(true)}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext).confirm;
