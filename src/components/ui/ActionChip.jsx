// Hairline action chip (Message · View Profile · End) — shared by both trust
// panels. 36pt visual; hitSlop tops the target past 44pt. tonal = sky outline
// for the lead action, destructive = red outline (red is semantic only).
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function ActionChip({ label, onPress, tonal = false, destructive = false }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: tonal ? t.blueSoft : destructive ? t.redLine : t.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        numberOfLines={1}
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
