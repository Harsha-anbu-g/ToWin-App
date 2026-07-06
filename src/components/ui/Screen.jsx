// Screen shell — parchment page canvas + safe areas + optional header row
// (wordmark/title left, actions right). One idea per screen; 64px section rhythm.
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

export default function Screen({
  children,
  title,
  headerLeft,
  headerRight,
  scroll = true,
  style,
  contentStyle,
}) {
  const { t, spacing, text, fontFamily } = useTheme();

  const header =
    title || headerLeft || headerRight ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[3],
          minHeight: 56,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
          {headerLeft ?? (
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: fontFamily.display,
                fontSize: text.xl,
                color: t.ink,
                letterSpacing: -0.5,
              }}
            >
              {title}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          {headerRight}
        </View>
      </View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: spacing[5], paddingBottom: spacing[12] }, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: spacing[5] }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top']} style={[{ flex: 1, backgroundColor: t.surface }, style]}>
      {header}
      {body}
    </SafeAreaView>
  );
}
