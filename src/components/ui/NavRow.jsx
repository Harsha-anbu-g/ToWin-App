// Top nav row (3a/4a): menu · wordmark · gold trust pill · person-add.
// The wordmark is the one non-serif brand mark: SF 19/600 in blueTeal,
// -0.4 tracking. Icon boxes are 40pt visually; hitSlop tops them to >=44pt.
// Trust pill only renders once the score is known — no flash of "undefined".
import { Menu, UserRoundPlus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function IconTarget({ label, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export default function NavRow({ trustScore, onMenu, onAddFriends, style }) {
  const { t, radius, type } = useTheme();

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: -9 }}>
        <IconTarget label="Menu" onPress={onMenu}>
          <Menu size={22} color={t.ink} strokeWidth={1.8} />
        </IconTarget>
        <Text
          style={{
            fontSize: type.wordmark,
            fontWeight: '600',
            color: t.blueTeal,
            letterSpacing: -0.4,
          }}
        >
          ToWin
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {trustScore != null ? (
          <View
            accessible
            accessibilityLabel={`${trustScore} trust`}
            style={{
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
            }}
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
          </View>
        ) : null}
        <IconTarget label="Add friends" onPress={onAddFriends}>
          <UserRoundPlus size={21} color={t.blueDeep} strokeWidth={1.8} />
        </IconTarget>
      </View>
    </View>
  );
}
