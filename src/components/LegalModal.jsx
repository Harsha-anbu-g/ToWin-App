// Legal document sheet. Port of Register.jsx's LegalModal (draft legal copy).
//
// iOS gets the REAL system sheet (owner call 2026-08-17: Apple design
// wherever possible): presentationStyle pageSheet — rounded card, the screen
// recedes, native drag-down dismiss. Android and web keep the bottom card
// with the hand grabber, since pageSheet does not exist there.
import { useRef } from 'react';
import { Modal, PanResponder, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LegalSections from './legal/LegalSections';
import Button from './ui/Button';
import { DRAFT } from '../data/legalContent';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

const IS_IOS_SHEET = Platform.OS === 'ios';

export default function LegalModal({ title, sections, visible, onClose }) {
  const { t, spacing, radius, text, fontFamily, pressRipple } = useTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  // Android/web only — the hand-rolled drag-down on the card's header area.
  // iOS never uses this: the native sheet owns its own gesture.
  const liveClose = useRef(onClose);
  liveClose.current = onClose;
  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 2,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 60 || g.vy > 0.5) liveClose.current();
      },
    })
  ).current;

  const header = (
    <View
      style={{
        paddingHorizontal: spacing[5],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        android_ripple={pressRipple}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: text.base, color: t.ink3, lineHeight: 20 }}>×</Text>
      </Pressable>
    </View>
  );

  const body = (
    <ScrollView contentContainerStyle={{ padding: spacing[5] }}>
      <Text
        style={{
          fontSize: 12,
          color: t.ink4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: '600',
          marginBottom: spacing[4],
        }}
      >
        {DRAFT.eyebrow}
      </Text>
      {/* Said in full at signup. This is the document somebody is
          about to tick a box against. */}
      <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22, marginBottom: 6 }}>
        {DRAFT.body}
      </Text>
      <Text style={{ fontSize: 12, color: t.ink4, marginBottom: spacing[4] }}>
        {DRAFT.asOf}
      </Text>
      <LegalSections sections={sections} />
    </ScrollView>
  );

  const footer = (
    <View
      style={{
        padding: spacing[4],
        paddingBottom: IS_IOS_SHEET ? Math.max(insets.bottom, spacing[4]) : spacing[4],
        borderTopWidth: 1,
        borderTopColor: t.border,
      }}
    >
      <Button title="Close" variant="primary" onPress={onClose} />
    </View>
  );

  if (IS_IOS_SHEET) {
    return (
      <Modal
        testID="legal-modal"
        visible={visible}
        presentationStyle="pageSheet"
        // Android-only props, inert under pageSheet — kept so the Android
        // edge-to-edge contract (android-platform.test.js) holds for every
        // Modal in the tree no matter which branch renders.
        statusBarTranslucent
        navigationBarTranslucent
        animationType={reducedMotion ? 'none' : 'slide'}
        onRequestClose={onClose}
        // The native drag-down dismisses the sheet itself; sync our state.
        onDismiss={onClose}
      >
        <View style={{ flex: 1, backgroundColor: t.canvas }}>
          {header}
          {body}
          {footer}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      testID="legal-modal"
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          padding: spacing[5],
          // The scrim now runs under the gesture bar, so the sheet itself must
          // keep clear of it (profile-edit's footer pattern).
          paddingBottom: Math.max(insets.bottom, spacing[5]),
        }}
      >
        {/* The dimmed parent is its own control: tapping outside the sheet is a
            third way out, alongside the × and the Close button. */}
        <Pressable
          testID="legal-scrim"
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.scrim }}
        />
        <View
          style={{
            backgroundColor: t.canvas,
            borderRadius: radius.xl,
            maxHeight: '85%',
            overflow: 'hidden',
          }}
        >
          {/* Grabber — the system sheet's handle, drawn here because this is
              a hand-rolled sheet. Dragging it (or the header) down closes. */}
          <View {...drag.panHandlers}>
            <View
              aria-hidden
              style={{
                alignSelf: 'center',
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.border,
                marginTop: 8,
              }}
            />
            {header}
          </View>
          {body}
          {footer}
        </View>
      </View>
    </Modal>
  );
}
