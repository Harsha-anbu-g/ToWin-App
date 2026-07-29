// Peekaboo row (3a) — the quiet second item on Home: the tortoise, one line,
// and a tonal Play chip into the game. White card, hairline border, r16.
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import TortoiseMark from '../TortoiseMark';
import { useTheme } from '../../theme/ThemeContext';

export default function PeekabooRow() {
  const { t, radius, spacing, type } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Peekaboo. A quiet minute with the tortoise. Play"
      onPress={() => router.push('/game')}
      style={({ pressed }) => ({
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 58,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TortoiseMark size={34} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>Peekaboo</Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 1 }}>
          A quiet minute with the tortoise
        </Text>
      </View>
      <View
        style={{
          // minHeight, not height — the label has to grow at 200% text scale
          minHeight: 34,
          paddingVertical: spacing[2],
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: t.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Play</Text>
      </View>
    </Pressable>
  );
}
