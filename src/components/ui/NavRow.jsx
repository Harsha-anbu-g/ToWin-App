// Top nav row (3a/4a): menu · wordmark · gold trust pill · person-add.
// The wordmark is the one non-serif brand mark: SF 19/600 in blueTeal,
// -0.4 tracking. Icon buttons are labeled 44pt columns (audit 2026-07-17:
// icon-only glyphs — UserRoundPlus especially — aren't self-evident for
// elders; captions use the tab-bar label size, same convention).
// Trust pill only renders once the score is known — no flash of "undefined".
import { useRouter } from 'expo-router';
import { Menu, UserRoundPlus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function IconTarget({ label, caption, captionColor, onPress, children }) {
  const { type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
      <Text style={{ fontSize: type.tabLabel, fontWeight: '600', color: captionColor, marginTop: 1 }}>
        {caption}
      </Text>
    </Pressable>
  );
}

export default function NavRow({ trustScore, onMenu, onAddFriends, style }) {
  const { t, radius, type } = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 16,
          paddingRight: 8,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: -11 }}>
        <IconTarget label="Menu" caption="Menu" captionColor={t.inkSlate} onPress={onMenu}>
          <Menu size={22} color={t.ink} strokeWidth={1.8} />
        </IconTarget>
        <Text
          style={{
            fontSize: type.wordmark,
            fontWeight: '600',
            color: t.greenDeep, // website navbar wordmark green (--green-deep)
            letterSpacing: -0.4,
          }}
        >
          Towinly
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {trustScore != null ? (
          // The score is the doorway to the Trust Score page (user call
          // 2026-07-26) — it was a dead label before.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${trustScore} trust. Open your Trust Score page`}
            onPress={() => router.push('/trust')}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: t.blueWash,
              borderWidth: 1,
              borderColor: t.blueSoft,
              borderRadius: radius.pill,
              paddingVertical: 5,
              paddingHorizontal: 11,
              marginRight: 6,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontSize: type.meta,
                fontWeight: '600',
                color: t.trustGold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {trustScore}
            </Text>
            <Text style={{ fontSize: type.caption, color: t.trustGold }}>trust</Text>
          </Pressable>
        ) : null}
        {/* FAMILY users have no discovery surface (family-in-trust 2026-07-19)
            — no handler, no button, instead of a dead target. */}
        {onAddFriends ? (
          <IconTarget label="Add friends" caption="Friends" captionColor={t.blueDeep} onPress={onAddFriends}>
            <UserRoundPlus size={21} color={t.blueDeep} strokeWidth={1.8} />
          </IconTarget>
        ) : null}
      </View>
    </View>
  );
}
