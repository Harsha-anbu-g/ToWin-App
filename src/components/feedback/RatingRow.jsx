// One 1–5 star row of the feedback form (extracted from app/feedback.jsx —
// the screen file keeps only the form's shape). 44pt targets with real gaps:
// five 38pt stars sharing edges made 3★-vs-4★ mis-taps certain (rulebook).
import { Pressable, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme/ThemeContext';

export default function RatingRow({ label, value, onChange }) {
  const { t, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Text style={{ fontSize: type.body, color: t.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: value >= n }}
            onPress={() => {
              // A rating is a value changing under the finger → the selection
              // tick (§11) — same star, same tap, same tick, forever.
              haptic.selection();
              onChange(value === n ? 0 : n);
            }}
            style={({ pressed }) => ({
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Star
              size={20}
              color={value >= n ? t.trustGold : t.idleGrey}
              fill={value >= n ? t.trustGold : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
