// Shared family list primitives (FAM-403) — extracted from FamilyHomePanel so
// the elder's My Family screen reuses the exact same rows instead of copying
// them (spec 2026-07-19: extend, don't duplicate).
//
// People render as hairline rows, the same line the elder's HelperCard and
// the helper's ElderCard draw (owner call 2026-08-26: "do the same for the
// family" — one row grammar across all three seats, which is also what the
// 2026-07-26 "make family look the same" call was asking for; the bordered
// cards it chose then are gone from those hubs too). A linked person is the name
// alone and opens their own page (`onPress`, owner call 2026-09-25: not a
// dropdown); a request stays open, because its Accept / Not now must never hide
// behind a tap.
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from '../icons';
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

// One person-row: avatar + serif name, then a consent-first sentence. `badge`
// sits right of the sentence (a label, never a button) and `children` carry
// the row's actions below it. `first` widens the gap under the section
// heading; later rows sit on a hairline. With `onPress`, the row is a doorway
// to the person's own page: the name alone and a chevron, no sentence or body.
export function LinkRow({ name, line, first, badge, onPress, children }) {
  const { t, spacing, type, fontFamily } = useTheme();

  const identity = (
    <>
      <Avatar name={name} size={48} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.ink }}
      >
        {name}
      </Text>
    </>
  );

  return (
    <View
      style={{
        marginTop: first ? spacing[2] : 0,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.hairline,
      }}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={name}
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            minHeight: 64,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {identity}
          <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 }}>
          {identity}
        </View>
      )}
      {!onPress ? (
        <View style={{ paddingBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>{line}</Text>
            {badge}
          </View>
          {children}
        </View>
      ) : null}
    </View>
  );
}
