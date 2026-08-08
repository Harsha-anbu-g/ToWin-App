// The body of a legal document: heading, paragraph, and an optional link out.
//
// Extracted because three surfaces render the same list and drifted apart:
// app/terms.jsx, app/privacy.jsx and the signup sheet in LegalModal.jsx. The
// document somebody ticks a box against at signup and the one they look up two
// years later have to be the same document, and that is easier to keep true
// when there is one renderer instead of three copies of the same JSX.
//
// The link exists for audit finding V7: the privacy policy has to point at the
// public account-deletion page. A person who has already removed the app cannot
// tap a sentence, so it is a real 44pt control, not a URL printed as text.
import { Linking, Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * @param {{ sections: {h: string, p: string, link?: {label: string, url: string}}[] }} props
 */
export default function LegalSections({ sections }) {
  const { t, spacing, text } = useTheme();

  return sections.map((s) => (
    <View key={s.h} style={{ marginBottom: spacing[5] }}>
      <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
        {s.h}
      </Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22 }}>{s.p}</Text>
      {s.link ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={s.link.label}
          accessibilityHint="Opens the account deletion page in your browser"
          onPress={() => Linking.openURL(s.link.url).catch(() => {})}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {/* blueDeep: links wear the action colour. The filled sky-blue button
              stays reserved for the one primary action on a screen. */}
          <Text
            style={{
              fontSize: text.sm,
              fontWeight: '600',
              color: t.blueDeep,
              textDecorationLine: 'underline',
              lineHeight: 22,
            }}
          >
            {s.link.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  ));
}
