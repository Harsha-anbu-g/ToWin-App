// Chip — canvas select chips (3e "Kind of help", filters) in M3 selected-state
// grammar: idle = white card + hairline border; selected = tonal blueWash,
// blueSoft border, blueDeep label with a leading check. `neutral` renders the
// quiet surfaceFill status pill (3f). 36pt visual, hitSlop tops up to >=44pt.
import { Check } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Chip({ label, selected = false, neutral = false, onPress, style }) {
  const { t, radius, type } = useTheme();

  const backgroundColor = selected ? t.blueWash : neutral ? t.surfaceFill : t.canvas;
  const borderColor = selected ? t.blueSoft : t.border;
  const color = selected ? t.blueDeep : neutral ? t.inkSlate : t.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[
        {
          minHeight: 36, // min, not fixed — grows with the OS large-text setting
          paddingVertical: 6,
          paddingHorizontal: selected ? 14 : 15,
          borderRadius: radius.pill,
          backgroundColor,
          borderWidth: 1,
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {selected ? <Check size={14} color={t.blueDeep} strokeWidth={2} /> : null}
      <Text style={{ fontSize: type.meta, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
}
