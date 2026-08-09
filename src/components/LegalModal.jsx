// Legal document sheet. Port of Register.jsx's LegalModal (draft legal copy).
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LegalSections from './legal/LegalSections';
import Button from './ui/Button';
import { DRAFT } from '../data/legalContent';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

export default function LegalModal({ title, sections, visible, onClose }) {
  const { t, spacing, radius, text, fontFamily, pressRipple } = useTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

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

          <View
            style={{
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.border,
            }}
          >
            <Button title="Close" variant="primary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
