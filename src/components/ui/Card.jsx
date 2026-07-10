// Card — Material surface (MD3 elevated look) with the app's spacing. Keeps
// the same API (children, style, testID) as before.
import { Card as PaperCard } from 'react-native-paper';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Card({ children, style, contentStyle, testID, ...rest }) {
  const { t, spacing, radius } = useTheme();
  return (
    <PaperCard
      testID={testID}
      mode="elevated"
      elevation={1}
      style={[
        {
          backgroundColor: t.canvas,
          borderRadius: radius.lg,
        },
        style,
      ]}
      {...rest}
    >
      <View style={[{ padding: spacing[5] }, contentStyle]}>{children}</View>
    </PaperCard>
  );
}
