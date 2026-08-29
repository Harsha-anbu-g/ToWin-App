// The count a folded row wears on its right, before the chevron: the way an
// unread chat row carries its number and a Posted Help title its offers
// waiting (PostedHelpList). Now on the trust hubs too (owner calls
// 2026-08-28): a step waiting for the helper's accept, a step the helper
// accepted that the elder has not yet opened. badgeFill, the settled
// non-inverting badge blue every count badge in the app wears; hidden from
// assistive tech because the row's own label speaks the news.
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function RowBadge({ count, style }) {
  const { t, fontScaleCaps } = useTheme();
  if (!(count > 0)) return null;
  return (
    <View
      testID="row-badge"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          paddingHorizontal: 6,
          backgroundColor: t.badgeFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        // Chrome cap, like the tab badges: at large OS text the numeral must
        // stay inside its 22pt bed (UX-701).
        maxFontSizeMultiplier={fontScaleCaps.chrome}
        style={{ fontSize: 12, fontWeight: '700', color: t.badgeText, fontVariant: ['tabular-nums'] }}
      >
        {count}
      </Text>
    </View>
  );
}
