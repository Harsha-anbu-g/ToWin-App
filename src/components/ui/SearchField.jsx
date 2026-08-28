// SearchField — the search box that sits above a list, the way WhatsApp puts
// one above Chats (owner call 2026-08-28: "keep a search tab in messages,
// posted help, and also in my helpers like whatsapp"). A native TextInput in
// a grey pill with the magnifier on the left; iOS draws its own clear button
// while editing, Android and web get one drawn here because they have none.
// The list it narrows decides what to search (src/lib/searchFilter.js).
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Search, X } from '../icons';
import { useTheme } from '../../theme/ThemeContext';

export default function SearchField({ value, onChangeText, placeholder = 'Search', label = 'Search', style }) {
  const { t, spacing, radius, type, fontScaleCaps, pressRipple } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          minHeight: 40,
          paddingHorizontal: spacing[3],
          borderRadius: radius.md,
          backgroundColor: t.surfaceFill,
        },
        style,
      ]}
    >
      <Search size={18} color={t.ink4} strokeWidth={2} />
      <TextInput
        accessibilityLabel={label}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        // ink4 over surfaceFill: the one placeholder pair the contrast suite
        // already clears at 4.5:1 (AskAiAssistant uses the same).
        placeholderTextColor={t.ink4}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        maxFontSizeMultiplier={fontScaleCaps.body}
        style={{ flex: 1, minHeight: 40, fontSize: type.body, color: t.ink, paddingVertical: 0 }}
      />
      {Platform.OS !== 'ios' && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          android_ripple={pressRipple}
          hitSlop={8}
          style={({ pressed }) => ({ minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <X size={16} color={t.ink4} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The line a list shows when the search finds nothing: it names the query so
// the person knows what was looked for, and never borrows the list's own
// "nobody here yet" state, which would send them off to find friends.
export function SearchMiss({ query, style }) {
  const { t, spacing, type, fontScaleCaps } = useTheme();
  return (
    <Text
      accessibilityRole="text"
      maxFontSizeMultiplier={fontScaleCaps.body}
      style={[{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, paddingVertical: spacing[4] }, style]}
    >
      {`No matches for “${query.trim()}”.`}
    </Text>
  );
}
