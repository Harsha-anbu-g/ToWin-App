// Card — Material component (react-native-paper) in OUTLINED mode: the Towinly
// brand does hairlines over shadows (DESIGN.md), and MD3's outlined card is
// exactly that. Same API as always (children, style, contentStyle, testID).
import { Card as PaperCard } from 'react-native-paper';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Card({ children, style, contentStyle, testID, ...rest }) {
  const { t, spacing, radius } = useTheme();
  return (
    <PaperCard
      testID={testID}
      mode="outlined"
      style={[
        {
          backgroundColor: t.canvas,
          borderColor: t.border,
          borderRadius: radius.card,
        },
        style,
      ]}
      {...rest}
    >
      <View style={[{ padding: spacing[6] }, contentStyle]}>{children}</View>
    </PaperCard>
  );
}
