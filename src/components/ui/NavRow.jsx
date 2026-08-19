// Top nav row: person-search · wordmark · gold trust pill · bell.
// The wordmark is the one non-serif brand mark: SF 19/600 in blueTeal,
// -0.4 tracking. Icon buttons are labeled 44pt columns (audit 2026-07-17:
// icon-only glyphs aren't self-evident for elders; captions use the tab-bar
// label size, same convention).
// Owner calls 2026-08-19: the Menu button is gone (its four orphan pages
// moved onto Profile), Add friends took its left slot with a person-search
// glyph — UserRoundPlus kept reading as the Profile tab's person — and the
// bell in the right corner opens Updates, the one place every notification
// lands. Trust pill only renders once the score is known — no flash of
// "undefined".
import { useRouter } from 'expo-router';
import { Bell, UserRoundSearch } from '../icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function IconTarget({ label, caption, captionColor, onPress, badgeCount, children }) {
  const { t, type, fontScaleCaps, pressRipple } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={pressRipple}
      hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View>
        {children}
        {badgeCount > 0 ? (
          // The red "new activity" storm, same voice as the tab badges.
          // Hidden from assistive tech: the count is folded into `label`.
          <Text
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            style={{
              position: 'absolute',
              top: -5,
              right: -9,
              minWidth: 16,
              height: 16,
              lineHeight: 15,
              borderRadius: 8,
              paddingHorizontal: 4,
              overflow: 'hidden',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              backgroundColor: t.red,
              color: t.canvas,
            }}
          >
            {badgeCount}
          </Text>
        ) : null}
      </View>
      <Text
        maxFontSizeMultiplier={fontScaleCaps.chrome}
        style={{ fontSize: type.tabLabel, fontWeight: '600', color: captionColor, marginTop: 1 }}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

export default function NavRow({ trustScore, onAddFriends, onAlerts, alertCount = 0, style }) {
  const { t, radius, type, fontScaleCaps, pressRipple } = useTheme();
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
        {/* FAMILY users have no discovery surface (family-in-trust 2026-07-19)
            — no handler, no button, instead of a dead target. */}
        {onAddFriends ? (
          <IconTarget label="Add friends" caption="Friends" captionColor={t.blueDeep} onPress={onAddFriends}>
            <UserRoundSearch size={21} color={t.blueDeep} strokeWidth={1.8} />
          </IconTarget>
        ) : null}
        <Text
          maxFontSizeMultiplier={fontScaleCaps.chrome}
          style={{
            fontSize: type.wordmark,
            fontWeight: '600',
            color: t.greenDeep, // website navbar wordmark green (--green-deep)
            letterSpacing: -0.4,
            marginLeft: onAddFriends ? 0 : 11, // no button → wordmark holds the edge
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
            android_ripple={pressRipple}
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
              maxFontSizeMultiplier={fontScaleCaps.chrome}
              style={{
                fontSize: type.meta,
                fontWeight: '600',
                color: t.trustGold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {trustScore}
            </Text>
            <Text maxFontSizeMultiplier={fontScaleCaps.chrome} style={{ fontSize: type.caption, color: t.trustGold }}>
              trust
            </Text>
          </Pressable>
        ) : null}
        {onAlerts ? (
          <IconTarget
            label={alertCount > 0 ? `Updates, ${alertCount} new` : 'Updates'}
            caption="Updates"
            captionColor={t.inkSlate}
            onPress={onAlerts}
            badgeCount={alertCount}
          >
            <Bell size={21} color={t.ink} strokeWidth={1.8} />
          </IconTarget>
        ) : null}
      </View>
    </View>
  );
}
