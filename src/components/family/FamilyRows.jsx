// Shared family list primitives (FAM-403) — extracted from FamilyHomePanel so
// the elder's My Family screen reuses the exact same rows instead of copying
// them (spec 2026-07-19: extend, don't duplicate).
//
// People render as hairline rows, the same line the elder's HelperCard and
// the helper's ElderCard draw (owner call 2026-08-26: "do the same for the
// family" — one row grammar across all three seats, which is also what the
// 2026-07-26 "make family look the same" call was asking for; the bordered
// cards it chose then are gone from those hubs too). A linked person folds to
// the name alone until touched (`collapsible`); a request stays open, because
// its Accept / Not now must never hide behind a tap.
import { useState } from 'react';
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
// heading; later rows sit on a hairline. With `collapsible`, the row shows
// the name alone until the name is touched — the sentence rides the spoken
// label so nothing is hidden from a screen reader (HCI rule 1).
export function LinkRow({ name, line, first, badge, collapsible = false, children }) {
  const { t, spacing, type, fontFamily } = useTheme();
  const [open, setOpen] = useState(false);
  const showBody = !collapsible || open;

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
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}. ${line}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            minHeight: 64,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {identity}
          <ChevronRight
            size={18}
            color={t.inkFaint2}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 }}>
          {identity}
        </View>
      )}
      {showBody ? (
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
