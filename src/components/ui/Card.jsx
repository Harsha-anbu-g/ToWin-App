// ToWin card — white surface, 1px warm hairline, radius 14–20, NO drop shadow
// (elevation via surface contrast; DESIGN.md).
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Card({ children, style, testID, ...rest }) {
  const { t, spacing, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: t.canvas,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.xl,
          padding: spacing[6],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
