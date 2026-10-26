// The seven reunion steps as a horizontal ladder, in the same grammar as the
// Trust Ladder (check circles for steps taken, a ring for the current one,
// 2px connectors) so the elder reads it at a glance. The goal node is a
// check in a wash circle: the tortoise stays the trust mark (HCI rule 4).
import { View } from 'react-native';
import { Check } from '../icons';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../i18n';

export default function ReunionLadder({ stepIndex, done = false, style }) {
  const { t } = useTheme();
  const label = done
    ? tr('Reunion: step 7 of 7, everyone home')
    : tr('Reunion: step {n} of 7', { n: Math.min(stepIndex + 1, 7) });
  return (
    <View accessible accessibilityLabel={label} style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const isGoal = i === 6;
        const taken = i < stepIndex || (done && isGoal);
        const current = i === stepIndex && !taken;
        return (
          // No flex on node 0 (see TrustLadder: react-native-web turns flex: 0
          // into flex-basis: 0% and piles the ladder onto the first circle).
          <View key={i} style={[{ flexDirection: 'row', alignItems: 'center' }, i > 0 && { flex: 1 }]}>
            {i > 0 ? (
              <View style={{ flex: 1, height: 2, backgroundColor: i <= stepIndex ? t.blue : t.avatarGrey }} />
            ) : null}
            <View
              style={{
                width: isGoal ? 22 : 20,
                height: isGoal ? 22 : 20,
                borderRadius: 11,
                backgroundColor: taken ? t.blue : isGoal ? t.blueWash : t.surface,
                borderWidth: isGoal && !taken ? 1 : 2,
                borderColor: taken || current ? t.blue : isGoal ? t.blueSoft : t.idleGrey,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {taken ? <Check size={10} color={t.actionInk} strokeWidth={2.5} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
