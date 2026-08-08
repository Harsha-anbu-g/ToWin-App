// Pick one person, from the people this elder actually knows here.
//
// Deliberately a list of large, plainly labelled rows rather than a native
// wheel: the people on this list are the elder's daughter and the helper she
// trusts — they are worth a whole row each.
import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Props:
 *   people  — [{ id, name, note }]; `note` is the quiet second line ("Daughter")
 *   value   — the chosen id, or null
 *   onChange(id)
 *   label   — the question this list answers, e.g. "Who is this for?"
 *   emptyMessage — shown instead of the list when nobody is available
 */
export default function PersonPicker({ people, value, onChange, label, emptyMessage }) {
  const { t, text, type, radius, spacing } = useTheme();

  if (!people.length) {
    return (
      <View>
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 10 }}>
          {label}
        </Text>
        <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 22 }}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 10 }}>
        {label}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing[2] }}>
        {people.map((person) => {
          const chosen = value === person.id;
          return (
            <Pressable
              key={person.id}
              accessibilityRole="radio"
              accessibilityLabel={person.note ? `${person.name}, ${person.note}` : person.name}
              aria-checked={chosen}
              onPress={() => onChange(person.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                minHeight: 56,
                paddingVertical: spacing[2],
                paddingHorizontal: spacing[4],
                borderRadius: radius.lg,
                borderWidth: chosen ? 1.5 : 1,
                borderColor: chosen ? t.blueDeep : t.border,
                backgroundColor: chosen ? t.blueWash : t.canvas,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {/* A drawn ring, never a text glyph — ✓ reads as a placeholder. */}
              <View
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: chosen ? t.blueDeep : t.border,
                  backgroundColor: chosen ? t.blueDeep : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {chosen ? <Check size={14} color={t.actionInk} strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink }}>
                  {person.name}
                </Text>
                {person.note ? (
                  <Text style={{ fontSize: type.meta, color: t.ink3, marginTop: 1 }}>
                    {person.note}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
