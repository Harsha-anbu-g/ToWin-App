// One reunion on the list: what it is, where it stands, who is coming.
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from '../icons';
import { STEP_NAMES, guestLine, stepIndex } from '../../lib/reunionSteps';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../i18n';

export default function ReunionRow({ reunion, onPress, divider }) {
  const { t, type, fontFamily, spacing } = useTheme();
  const stopped = reunion.step === 'STOPPED';
  const idx = stepIndex(reunion.step);
  const stage = stopped
    ? tr('Stopped')
    : tr('Step {n} of 7 · {name}', { n: idx + 1, name: tr(STEP_NAMES[idx]) });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('{institution}. {stage}', { institution: reunion.institution, stage })}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        minHeight: 64,
        paddingVertical: spacing[3],
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: t.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: type.body, color: t.ink }} numberOfLines={2}>
          {reunion.institution}
        </Text>
        <Text style={{ fontSize: type.caption, color: stopped ? t.ink4 : t.blueDeep, marginTop: 2 }}>{stage}</Text>
        <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{guestLine(reunion)}</Text>
      </View>
      <ChevronRight size={18} color={t.ink4} />
    </Pressable>
  );
}
