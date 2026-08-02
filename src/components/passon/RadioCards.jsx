// One question, one large tappable card per answer, in the elder's own words.
// Shared by the four story audiences and the two letter release times — the
// same question shape, and an elder who has learned to tap these cards once
// should not meet a second control that behaves differently down the form.
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * @param options [{ key, title, blurb, disabled? }]
 */
export default function RadioCards({ prompt, options, value, onChange }) {
  const { t, text, radius, spacing } = useTheme();

  return (
    <View>
      <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 10 }}>
        {prompt}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={prompt} style={{ gap: spacing[2] }}>
        {options.map((o) => {
          const chosen = value === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityLabel={o.blurb ? `${o.title}. ${o.blurb}` : o.title}
              accessibilityState={{ checked: chosen, disabled: !!o.disabled }}
              disabled={o.disabled}
              onPress={() => onChange(o.key)}
              style={({ pressed }) => ({
                minHeight: 56,
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[4],
                borderRadius: radius.lg,
                borderWidth: chosen ? 1.5 : 1,
                borderColor: chosen ? t.blueDeep : t.border,
                backgroundColor: chosen ? t.blueWash : t.canvas,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {/* A card she cannot choose goes quiet, never faint: an option
                  dimmed below reading contrast is one she cannot find out how
                  to unlock. */}
              <Text
                style={{
                  fontSize: text.sm,
                  fontWeight: '600',
                  color: o.disabled ? t.ink3 : t.ink,
                }}
              >
                {o.title}
              </Text>
              {o.blurb ? (
                <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 22, marginTop: 2 }}>
                  {o.blurb}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
