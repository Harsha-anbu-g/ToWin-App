// Hairline action chip (Message · View Profile · End) — shared by both trust
// panels. 36pt visual; hitSlop tops the target past 44pt. tonal = sky outline
// for the lead action, destructive = red outline (red is semantic only).
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// `disabled` dims and blocks the chip while its mutation runs (HCI rule 1:
// every tap shows progress); `style` lets rows stretch chips (flex:1) so
// paired actions split the width like the website's side-by-side ghosts.
export default function ActionChip({ label, onPress, tonal = false, destructive = false, disabled = false, style }) {
  const { t, radius, type, fontScaleCaps } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={({ pressed }) => [
        {
          // min, not fixed — the label must wrap at large OS text, never clip
          minHeight: 36,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: tonal ? t.blueSoft : destructive ? t.redLine : t.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={fontScaleCaps.body}
        style={{
          fontSize: type.meta,
          fontWeight: '600',
          color: tonal ? t.blueDeep : destructive ? t.redDeep : t.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
