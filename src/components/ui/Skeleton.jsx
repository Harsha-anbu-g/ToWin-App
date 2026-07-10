// Skeleton — calm static placeholder blocks while a card loads. No shimmer,
// no pulse: reduced-motion safe by construction, and quieter for elders.
// (ui-ux-pro-max: progressive loading beats spinners for >1s operations.)
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export function SkeletonLine({ width = '100%', height = 16, style }) {
  const { t, radius } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: t.greyFill3,
          borderWidth: 1,
          borderColor: t.hairline,
        },
        style,
      ]}
    />
  );
}

// A standard card-loading arrangement: title line + two content lines.
export default function SkeletonCard({ lines = 2 }) {
  const { spacing } = useTheme();
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      <SkeletonLine width="45%" height={20} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? '60%' : '90%'}
          style={{ marginTop: spacing[3] }}
        />
      ))}
    </View>
  );
}
