// Screen shell — parchment page canvas + safe areas + optional header row
// (wordmark/title left, actions right). One idea per screen; 64px section rhythm.
// `back` renders a VISIBLE back chevron — elders shouldn't need to know the
// swipe gesture (HCI: user control and freedom).
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import KeyboardAvoider from './KeyboardAvoider';

export default function Screen({
  children,
  title,
  headerLeft,
  headerRight,
  back = false,
  scroll = true,
  keyboard = false,
  // Tab screens sit under the floating Ask-AI pill — `fab` adds the clearance
  // so the last row is never rendered (or tapped) underneath it (rulebook pass).
  fab = false,
  style,
  contentStyle,
}) {
  const { t, spacing, text, fontFamily, fontScaleCaps } = useTheme();
  const router = useRouter();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header =
    title || headerLeft || headerRight || back ? (
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
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: spacing[2] }}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={8}
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                marginLeft: -spacing[2],
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ArrowLeft size={24} color={t.blueDeep} />
            </Pressable>
          ) : null}
          {headerLeft ?? (
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={fontScaleCaps.body}
              style={{
                fontFamily: fontFamily.display,
                fontSize: text.xl,
                color: t.ink,
                letterSpacing: -0.5,
                flexShrink: 1,
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
      contentContainerStyle={[
        { padding: spacing[5], paddingBottom: fab ? 120 : spacing[12] },
        contentStyle,
      ]}
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
      {keyboard ? <KeyboardAvoider>{body}</KeyboardAvoider> : body}
    </SafeAreaView>
  );
}
