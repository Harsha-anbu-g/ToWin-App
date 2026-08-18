// Hairline action chip (Message · View Profile · End) — shared by both trust
// panels. The 44pt target is a real box, not hitSlop: react-native-web drops
// hitSlop, so the web build got a 36pt chip (DEEP-08), and chips sit in rows
// with an 8pt gap that slop would eat (Chip.jsx). tonal = sky outline for the
// lead action, destructive = red outline (red is semantic only).
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// `disabled` dims and blocks the chip while its mutation runs (HCI rule 1:
// every tap shows progress); `style` lets rows stretch chips (flex:1) so
// paired actions split the width like the website's side-by-side ghosts.
export default function ActionChip({ label, onPress, tonal = false, destructive = false, disabled = false, style }) {
  const { t, radius, type, fontScaleCaps, pressRipple } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={pressRipple}
      // Normal-density chip (owner call 2026-08-17): 36pt visual pill; the
      // hitSlop keeps the native target near 44pt.
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        {
          // min, not fixed — the label must wrap at large OS text, never clip
          minHeight: 36,
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          // iOS tonal pill (owner calls 2026-08-17): the App Store GET-button
          // grammar — neutral gray fill, the COLOR lives in the text. A blue
          // fill on every chip drowned the screen in blue.
          backgroundColor: t.surfaceFill,
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
