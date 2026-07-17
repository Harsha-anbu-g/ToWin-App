// Landing story (handoff 3o): the website's 6 landing slides as a vertical
// paged deck, copy VERBATIM from landingSlides.js. Right edge carries the
// journey rail — 6 dots on a hairline track, a sky "walked" line, and the
// tortoise mark walking down (head-up on arrival), with an 0N/06 counter.
// Shown on first launch only (towin-onboarded flag); Log in / Start exits
// mark the flag and route on. One filled primary: Start, on the last slide.
import { useRouter } from 'expo-router';
import {
  Armchair,
  BadgeCheck,
  Car,
  Coffee,
  HandHeart,
  Link2,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  TrendingUp,
  Video,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TortoiseMark, { IntroBrandLockup } from '../../src/components/TortoiseMark';
import Button from '../../src/components/ui/Button';
import { COPY, CHAPTERS, STAGES } from '../../src/data/landingSlides';
import { markOnboarded } from '../../src/lib/onboarding';
import { useReducedMotion } from '../../src/lib/useReducedMotion';
import { useTheme } from '../../src/theme/ThemeContext';

const STAGE_ICONS = {
  'Just Connected': Link2,
  Messaging: MessageCircle,
  'Phone Ready': Phone,
  'Video Ready': Video,
  'Social Media': Share2,
  'Ready to Meet': Coffee,
};

function Chapter({ n, label }) {
  const { t, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: t.inkSlate, fontVariant: ['tabular-nums'], letterSpacing: 0.5 }}>
        {String(n).padStart(2, '0')}
      </Text>
      <View style={{ width: 26, height: 1, backgroundColor: t.border }} />
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkFaint2, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

function Title({ children }) {
  const { t, fontFamily } = useTheme();
  return (
    <Text style={{ fontFamily: fontFamily.display, fontSize: 27, color: t.ink, letterSpacing: -0.5, lineHeight: 32, textAlign: 'center', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function Lead({ children, size = 16 }) {
  const { t } = useTheme();
  return (
    <Text style={{ fontSize: size, color: t.inkSlate, lineHeight: size * 1.55, textAlign: 'center', marginBottom: 16 }}>
      {children}
    </Text>
  );
}

function NoteBox({ children }) {
  const { t, type } = useTheme();
  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 16 }}>
      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

function MiniCard({ title, badge, stars, Icon, children }) {
  const { t, radius, type } = useTheme();
  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          {Icon ? <Icon size={15} strokeWidth={2.2} color={t.inkSlate} /> : null}
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, letterSpacing: -0.2 }}>{title}</Text>
        </View>
        {badge ? (
          <View style={{ backgroundColor: t.blueWash, borderWidth: 1, borderColor: t.blueSoft, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: type.caption, fontWeight: '700', color: t.blueDeep }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {stars ? (
        <View accessibilityLabel="five stars" style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} color={t.trustGold} fill={t.trustGold} />
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

// One slide of the story. Index picks the layout; copy comes from COPY.
function Slide({ index }) {
  const { t, radius, type, fontFamily } = useTheme();
  const c = CHAPTERS[index];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingRight: 52 }}>
      <Chapter n={c.n} label={c.label} />

      {index === 0 && (
        <View style={{ alignItems: 'center' }}>
          <IntroBrandLockup size={58} wordStyle={{ fontSize: 26, fontWeight: '600', color: t.ink, letterSpacing: -0.6 }} />
          <Text style={{ fontFamily: fontFamily.display, fontSize: 34, color: t.ink, letterSpacing: -0.7, lineHeight: 38, textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
            It takes <Text style={{ fontFamily: fontFamily.displayItalic }}>two</Text> To Win.
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '500', color: t.inkSlate, textAlign: 'center', marginBottom: 12 }}>
            Connecting generations, building <Text style={{ color: t.trustGold, fontWeight: '600' }}>trust</Text>.
          </Text>
          <Text style={{ fontSize: type.body, color: t.ink2, lineHeight: 22, textAlign: 'center' }}>{COPY.welcome.body}</Text>
        </View>
      )}

      {index === 1 && (
        <View>
          <Title>{COPY.people.title}</Title>
          <Lead>{COPY.people.lead}</Lead>
          <View style={{ gap: 12 }}>
            {COPY.people.cards.map((card, i) => (
              <MiniCard key={card.title} title={card.title} Icon={i === 0 ? Armchair : HandHeart}>
                {card.body}
              </MiniCard>
            ))}
          </View>
        </View>
      )}

      {index === 2 && (
        <View>
          <Title>{COPY.solves.title}</Title>
          <Lead>{COPY.solves.lead}</Lead>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            {COPY.solves.chips.map((label, i) => {
              const Icon = [ShoppingBag, Car, MessageCircle][i];
              return (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Icon size={15} strokeWidth={2} color={t.blueTeal} />
                  <Text style={{ fontSize: type.body, fontWeight: '500', color: t.inkSlate }}>{label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: type.body, color: t.ink2, lineHeight: 22, textAlign: 'center' }}>{COPY.solves.body}</Text>
        </View>
      )}

      {index === 3 && (
        <View>
          <Title>
            <Text style={{ color: t.trustGold }}>Trust</Text> is earned, not given
          </Title>
          <Lead size={15}>{COPY.trust.lead}</Lead>
          <View style={{ gap: 8, marginBottom: 12 }}>
            <MiniCard title={COPY.trust.cards[0].title} badge={COPY.trust.cards[0].badge} Icon={BadgeCheck}>
              {COPY.trust.cards[0].body}
            </MiniCard>
            <MiniCard title={COPY.trust.cards[1].title} badge={COPY.trust.cards[1].badge} Icon={TrendingUp}>
              {COPY.trust.cards[1].body}
            </MiniCard>
            <MiniCard title={COPY.trust.cards[2].title} badge={COPY.trust.cards[2].badge} stars Icon={Star}>
              {COPY.trust.cards[2].body}
            </MiniCard>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.input, paddingVertical: 8 }}>
            <Text style={{ fontSize: type.meta, fontWeight: '500', color: t.inkSlate }}>{COPY.trust.total.formula}</Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: t.trustGold }}>{COPY.trust.total.score}</Text>
            <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{COPY.trust.total.caption}</Text>
          </View>
        </View>
      )}

      {index === 4 && (
        <View>
          <Title>
            Rooting (<Text style={{ color: t.trustGold }}>Trust</Text> Ladder): how trust grows
          </Title>
          <Lead size={15}>{COPY.rooting.lead}</Lead>
          <View style={{ alignSelf: 'center', marginBottom: 12 }}>
            {STAGES.map((s, i) => {
              const isGoal = i === STAGES.length - 1;
              const Icon = STAGE_ICONS[s];
              return (
                <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 34, alignItems: 'center' }}>
                    <View
                      style={{
                        width: isGoal ? 34 : 28,
                        height: isGoal ? 34 : 28,
                        borderRadius: radius.pill,
                        backgroundColor: isGoal ? t.canvas : t.blueWash,
                        borderWidth: 1.5,
                        borderColor: t.blueSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isGoal ? <TortoiseMark size={20} /> : <Icon size={13} strokeWidth={2.2} color={t.inkSlate} />}
                    </View>
                    {!isGoal ? <View style={{ flex: 1, width: 1.5, minHeight: 8, backgroundColor: t.blueSoft }} /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: isGoal ? 0 : 9, minHeight: isGoal ? 34 : 28 }}>
                    <Text
                      style={
                        isGoal
                          ? { fontFamily: fontFamily.display, fontSize: 17, color: t.ink }
                          : { fontSize: type.body, fontWeight: '500', color: t.ink }
                      }
                    >
                      {s}
                    </Text>
                    <View style={{ flexDirection: 'row', backgroundColor: t.blueWash, borderWidth: 1, borderColor: t.blueSoft, borderRadius: radius.pill, paddingVertical: 1, paddingHorizontal: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.blueDeep }}>+1</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.inkSlate }}> trust score</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <NoteBox>{COPY.rooting.note}</NoteBox>
        </View>
      )}

      {index === 5 && (
        <View>
          <Title>{COPY.why.title}</Title>
          <Lead size={14}>{COPY.why.lead}</Lead>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {COPY.why.exchange.map(({ role, have, need }, i) => {
              const Icon = i === 0 ? Armchair : HandHeart;
              return (
                <View key={role} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.surface2, paddingVertical: 8 }}>
                    <Icon size={15} strokeWidth={2.1} color={t.inkSlate} />
                    <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, letterSpacing: -0.2 }}>{role}</Text>
                  </View>
                  {[
                    ['HAVE', have],
                    ['NEED', need],
                  ].map(([label, textValue]) => (
                    <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.canvas }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.inkSlate, letterSpacing: 1.2, width: 44, paddingTop: 2 }}>{label}</Text>
                      <Text style={{ fontSize: type.meta, color: t.ink2, lineHeight: 19, flex: 1 }}>{textValue}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: t.ink, lineHeight: 26, textAlign: 'center' }}>
            ToWin is where they meet and share, and <Text style={{ fontFamily: fontFamily.displayItalic }}>both</Text> win.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function Landing() {
  const { t, type } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const walk = useRef(new Animated.Value(0)).current; // 0..1 down the rail

  const topBar = insets.top + 44;
  const slideH = height - topBar;
  const last = CHAPTERS.length - 1;

  const go = async (href) => {
    await markOnboarded();
    router.replace(href);
  };

  const onPage = (e) => {
    const i = Math.min(last, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / slideH)));
    setIndex(i);
    if (reduced) walk.setValue(i / last);
    else {
      Animated.timing(walk, {
        toValue: i / last,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // animates a layout % — rail is tiny, cheap
      }).start();
    }
  };

  const RAIL_H = slideH * 0.55;

  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      {/* Top bar: quiet brand + a Log in escape for returning users */}
      <View
        style={{
          paddingTop: insets.top,
          height: topBar,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TortoiseMark size={24} />
          <Text style={{ fontSize: type.wordmark, fontWeight: '600', color: t.greenDeep, letterSpacing: -0.4 }}>ToWin</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in"
          onPress={() => go('/(auth)/login')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 8 })}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.blueDeep }}>Log in</Text>
        </Pressable>
      </View>

      <FlatList
        data={CHAPTERS}
        keyExtractor={(c) => String(c.n)}
        renderItem={({ index: i }) => (
          <View style={{ height: slideH }}>
            <Slide index={i} />
            {i === last ? (
              <View style={{ paddingHorizontal: 28, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
                <Button title="Start" onPress={() => go('/(auth)/register')} />
              </View>
            ) : null}
          </View>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onPage}
        getItemLayout={(_, i) => ({ length: slideH, offset: slideH * i, index: i })}
      />

      {/* Journey rail — walked line + dots + the tortoise walking down */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 14, top: topBar + (slideH - RAIL_H) / 2, height: RAIL_H, width: 30, alignItems: 'center' }}
      >
        <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: t.inputLine }} />
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            width: 2,
            borderRadius: 1,
            backgroundColor: t.blue,
            height: walk.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
        {CHAPTERS.map((c, i) => (
          <View
            key={c.n}
            style={{
              position: 'absolute',
              top: `${(i / last) * 100}%`,
              marginTop: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i < index ? t.blue : t.inputLine,
              opacity: i === index ? 0 : 1, // the tortoise sits on the active dot
            }}
          />
        ))}
        <Animated.View
          style={{
            position: 'absolute',
            top: walk.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            marginTop: -13,
            transform: [{ rotate: index === last ? '0deg' : '180deg' }],
          }}
        >
          <TortoiseMark size={26} />
        </Animated.View>
        <Text
          style={{
            position: 'absolute',
            bottom: -24,
            fontSize: type.caption,
            fontWeight: '600',
            color: t.inkFaint2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(index + 1).padStart(2, '0')}/06
        </Text>
      </View>
    </View>
  );
}
