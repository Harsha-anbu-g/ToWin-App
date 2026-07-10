// Legal document sheet — port of Register.jsx's LegalModal (placeholder docs).
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Button from './ui/Button';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

export default function LegalModal({ title, sections, visible, onClose }) {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: t.scrim,
          justifyContent: 'center',
          padding: spacing[5],
        }}
      >
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
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
              Placeholder document, prototype only
            </Text>
            {sections.map((s) => (
              <View key={s.h} style={{ marginBottom: spacing[5] }}>
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
                  {s.h}
                </Text>
                <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22 }}>{s.p}</Text>
              </View>
            ))}
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
