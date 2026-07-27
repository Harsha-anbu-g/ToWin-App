// Shared family list primitives (FAM-403) — extracted from FamilyHomePanel so
// the elder's My Family screen reuses the exact same rows instead of copying
// them (spec 2026-07-19: extend, don't duplicate).
//
// People render as bordered cards, the same shape the elder's HelperCard and
// the helper's ElderCard use (user call 2026-07-26: "family login look so
// different from elders and helpers, make it look like the same"). The older
// hairline-row treatment is what made the family seat read as another app.
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';

export function SectionHeading({ children }) {
  const { t, spacing, fontFamily } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink, marginTop: spacing[5] }}
    >
      {children}
    </Text>
  );
}

// One person-card: avatar + name + a consent-first sentence. `badge` sits
// right (a label, never a button) and `children` carry the card's actions
// below the identity line. `first` only widens the gap under the section
// heading; every later card sits in an even stack.
export function LinkRow({ name, line, first, badge, children }) {
  const { t, spacing, radius, type } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        padding: spacing[4],
        marginTop: first ? spacing[4] : spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Avatar name={name} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{name}</Text>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: 2 }}>
            {line}
          </Text>
        </View>
        {badge}
      </View>
      {children}
    </View>
  );
}
