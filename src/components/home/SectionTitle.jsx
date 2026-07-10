// Editorial section marker — a quiet serif line on the parchment between
// moments, with an optional inline "See all" style action.
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function SectionTitle({ children, actionLabel, onAction }) {
  const { t, spacing, text, fontFamily } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: spacing[3],
        marginBottom: -spacing[1],
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, letterSpacing: -0.3 }}
      >
        {children}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} style={{ paddingVertical: 6 }}>
          <Text style={{ fontSize: text.sm, color: t.blueDeep, fontWeight: '600' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
