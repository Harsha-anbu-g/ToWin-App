// Trust chip — sky-wash fill, blue-soft hairline, the trust number ALWAYS in gold
// (DESIGN.md: gold is reserved for trust; sky-blue is reserved for actions).
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function TrustBadge({ score, label = 'trust', style }) {
  const { t, spacing, radius, text, fontScaleCaps } = useTheme();
  return (
    <View
      accessibilityLabel={`Trust score ${score}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: t.blueTint,
          borderWidth: 1,
          borderColor: t.blueSoft,
          borderRadius: radius.pill,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          gap: spacing[1],
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={fontScaleCaps.chrome}
        style={{ color: t.trustGold, fontSize: text.sm, fontWeight: '600', fontVariant: ['tabular-nums'] }}
      >
        {score}
      </Text>
      <Text maxFontSizeMultiplier={fontScaleCaps.chrome} style={{ color: t.trustGold, fontSize: text.sm }}>
        {label}
      </Text>
    </View>
  );
}
