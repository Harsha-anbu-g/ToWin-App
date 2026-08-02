// The first paint, before the Newsreader serif has arrived.
//
// The app used to render nothing at all here. On a phone that is hidden by the
// native splash screen, but a browser has no splash — under towinly.com/app/ a
// person tapping "Log in" would watch a blank page and reasonably conclude the
// site is broken (HCI 1: the system's state must always be visible).
//
// Deliberately WORDLESS: any text drawn now would appear in a fallback face and
// then jump when the serif loads, which is the exact flash the font gate exists
// to prevent. Screen-reader users are told in words instead — they are not
// looking at the typeface. No motion either, matching Skeleton's calm-by-
// construction rule, so there is nothing to reduce for reduced-motion users.
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SkeletonLine } from './Skeleton';

export default function BootScreen() {
  const { t, spacing } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Towinly"
      style={{
        flex: 1,
        backgroundColor: t.surface,
        paddingHorizontal: spacing[4],
        paddingTop: spacing[8],
        gap: spacing[4],
      }}
    >
      <SkeletonLine width="55%" height={28} />
      <SkeletonLine width="85%" />
      <SkeletonLine width="70%" />
    </View>
  );
}
