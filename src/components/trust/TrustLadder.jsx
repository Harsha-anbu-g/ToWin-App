// Horizontal 7-node trust ladder (3d/4a): blue check circles for climbed
// steps, a ring for the current one, the tortoise in a wash circle as the
// goal, 2px connectors. Shared by Dashboard (elder) and My Elders (helper).
import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import TortoiseMark from '../TortoiseMark';
import { useTheme } from '../../theme/ThemeContext';

export default function TrustLadder({ stageIndex, style }) {
  const { t } = useTheme();
  // One spoken summary for the whole ladder — and it must count the SAME way
  // as the visible "Stage N of 7" captions, or VoiceOver users are told a
  // different position than sighted users (HCI rule 6).
  const label =
    stageIndex >= 6
      ? 'Trust ladder: Stage 7 of 7 — full trust reached'
      : `Trust ladder: Stage ${Math.min(stageIndex + 1, 7)} of 7`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const isGoal = i === 6;
        const done = i < stageIndex || (stageIndex >= 6 && isGoal);
        const current = i === stageIndex && !done;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i === 0 ? 0 : 1 }}>
            {i > 0 ? (
              <View style={{ flex: 1, height: 2, backgroundColor: i <= stageIndex ? t.blue : t.avatarGrey }} />
            ) : null}
            {isGoal ? (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: t.blueWash,
                  borderWidth: 1,
                  borderColor: t.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TortoiseMark size={16} />
              </View>
            ) : (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: done ? t.blue : t.surface,
                  // A step you haven't reached still gets a real ring (user
                  // call 2026-07-26: "even though it is not done make the
                  // circle visible") — the old faint grey disc disappeared
                  // into the card.
                  borderWidth: 2,
                  borderColor: done ? t.blue : current ? t.blue : t.idleGrey,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? <Check size={12} color={t.actionInk} strokeWidth={2.5} /> : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
