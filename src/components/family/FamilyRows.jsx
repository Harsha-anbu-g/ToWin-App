// Shared family list primitives (FAM-403) — extracted from FamilyHomePanel so
// the elder's My Family screen reuses the exact same rows instead of copying
// them (spec 2026-07-19: extend, don't duplicate). Rows-not-boxes law: people
// render as hairline-separated rows straight on the page, never outlined boxes.
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

// One person-row: avatar + name + a consent-first sentence. Hairline above
// every row but the first; `badge` sits right (a label, never a button) and
// `children` carry the row's actions below the identity line.
export function LinkRow({ name, line, first, badge, children }) {
  const { t, spacing, type } = useTheme();
  return (
    <View
      style={{
        paddingVertical: spacing[4],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.hairline,
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
