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
  Bell,
  Car,
  Coffee,
  Eye,
  HandHeart,
  Link2,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  Video,
} from '../../src/components/icons';
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TortoiseMark, { IntroBrandLockup } from '../../src/components/TortoiseMark';
import Button from '../../src/components/ui/Button';
import { COPY, CHAPTERS, STAGES } from '../../src/data/landingSlides';
import { markOnboarded } from '../../src/lib/onboarding';
import { useReducedMotion } from '../../src/lib/useReducedMotion';
import { DURATION, EASE } from '../../src/theme/motion';
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
        <View
          // `accessible` is what makes the label reach VoiceOver: React Native
          // derives isAccessibilityElement from it, and on a plain View it
          // defaults false, so the label was dropped and five unlabelled Star
          // paths announced nothing at all. Collapsing the row into one
          // element is the intent: the stars are a single rating, not five
          // things.
          accessible
          accessibilityRole="image"
          accessibilityLabel="five stars"
          style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}
        >
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
    <View style={{ paddingHorizontal: 28, paddingRight: 52, paddingVertical: 12 }}>
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
              <MiniCard key={card.title} title={card.title} Icon={[Armchair, HandHeart, Users][i]}>
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
          <Lead>{COPY.trust.lead}</Lead>
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
          <Lead>{COPY.rooting.lead}</Lead>
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

      {/* Family stays close (web 15046a5): the elder is always in charge. */}
      {index === 5 && (
        <View>
          <Title>{COPY.family.title}</Title>
          <Lead>{COPY.family.lead}</Lead>
          <View style={{ gap: 8, marginBottom: 12 }}>
            {COPY.family.cards.map((card, i) => (
              <MiniCard key={card.title} title={card.title} Icon={[Eye, Bell, Users][i]}>
                {card.body}
              </MiniCard>
            ))}
          </View>
          <NoteBox>{COPY.family.note}</NoteBox>
        </View>
      )}

      {index === 6 && (
        <View>
          <Title>{COPY.why.title}</Title>
          <Lead>{COPY.why.lead}</Lead>
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
            Towinly is where they meet and share, and <Text style={{ fontFamily: fontFamily.displayItalic }}>both</Text> win.
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
  // The finger drives the feet: raw scroll offset, mapped below into the
  // rail's 0..1 walk. Direct manipulation, so going back glides exactly like
  // going forward, and there is no per-page tween to restart or stutter.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Which way the head points: 1 = down (walking on with the story),
  // 0 = up (walking back, or arrived at the end, the mark's natural pose).
  const facing = useRef(new Animated.Value(1)).current;

  const topBar = insets.top + 44;
  const slideH = height - topBar;
  const last = CHAPTERS.length - 1;
  const walk = scrollY.interpolate({
    inputRange: [0, Math.max(1, slideH * last)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const go = async (href) => {
    await markOnboarded();
    router.replace(href);
  };

  // The settled page: number, dots and the head-turn change once per arrival,
  // not at the mid-point of a drag (the number used to flip early and could
  // jitter when a slow drag hovered near halfway). Native fires this from
  // onMomentumScrollEnd; react-native-web never emits momentum events (its
  // ScrollViewBase only dispatches onScroll), so the web keeps calling it
  // from the scroll listener like before.
  const onPage = (e) => {
    const i = Math.min(last, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / slideH)));
    if (i === index) return;
    // Turn the head to face the way it walks: down when the story moves on,
    // up when the person walks back, and up on arrival at the end (the
    // original "head-up on arrival" pose).
    const headUp = i === last || i < index;
    setIndex(i);
    if (reduced) facing.setValue(headUp ? 0 : 1);
    else {
      Animated.timing(facing, {
        toValue: headUp ? 0 : 1,
        duration: DURATION.base,
        easing: EASE.out,
        useNativeDriver: true, // transform-only (rotate) — UI thread
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
          <Text style={{ fontSize: type.wordmark, fontWeight: '600', color: t.greenDeep, letterSpacing: -0.4 }}>Towinly</Text>
        </View>
        {/* gap 24, not 16: the two 8pt side slops eat 16 between them, and
            these are different destinations — 8dp of inert space has to survive. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          {/* Skip (rulebook: a 7-step walk always offers the way out for a
              NEW person — Log in alone routed them to the wrong door). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip the story and sign up"
            onPress={() => go('/(auth)/register')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              // A real 44pt box. These two are the only ways out of the
              // story, and the web build drops hitSlop, so padding alone
              // left them at about 38pt there (DEEP-08).
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 4,
            })}
          >
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.inkSlate }}>Skip</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={() => go('/(auth)/login')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              // A real 44pt box. These two are the only ways out of the
              // story, and the web build drops hitSlop, so padding alone
              // left them at about 38pt there (DEEP-08).
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 4,
            })}
          >
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.blueDeep }}>Log in</Text>
          </Pressable>
        </View>
      </View>

      {/* Animated.FlatList: the native-driver scroll stream (scrollY) only
          attaches to an Animated component. */}
      <Animated.FlatList
        testID="landing-pager"
        data={CHAPTERS}
        keyExtractor={(c) => String(c.n)}
        renderItem={({ index: i }) => (
          <View style={{ height: slideH }}>
            {/* Each fixed-height page scrolls internally when OS text scaling
                makes its content taller than the page — otherwise the story
                clips with no way to read it. When content fits (the common
                case), bounces=false means the gesture falls through to the
                pager unchanged. */}
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
            >
              <Slide index={i} />
            </ScrollView>
            {i === last ? (
              <View style={{ paddingHorizontal: 28, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
                {/* The end of a first-run story is read by somebody who has
                    no account yet, so it opens account creation. It used to
                    say "Start" and land on the login form, which is a door
                    they have no key to. Returning people still have the Log in
                    link in the top bar, where it has always been. */}
                <Button title="Create my account" onPress={() => go('/(auth)/register')} />
              </View>
            ) : null}
          </View>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        // scrollY tracks the finger on the UI thread (native driver); the web
        // has no native driver and no momentum events, so it takes the JS
        // path and drives the page bookkeeping from the same scroll stream.
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          Platform.OS === 'web'
            ? { useNativeDriver: false, listener: onPage }
            : { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onPage}
        getItemLayout={(_, i) => ({ length: slideH, offset: slideH * i, index: i })}
      />

      {/* Journey rail — walked line + dots + the tortoise walking down */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 14, top: topBar + (slideH - RAIL_H) / 2, height: RAIL_H, width: 30, alignItems: 'center' }}
      >
        <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: t.inputLine }} />
        {/* Walked line: a full-height bar scaled from its top edge —
            transform/opacity only, so the tween runs on the UI thread. */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            width: 2,
            height: RAIL_H,
            borderRadius: 1,
            backgroundColor: t.blue,
            transformOrigin: 'top',
            transform: [{ scaleY: walk }],
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
            top: 0,
            marginTop: -13,
            transform: [
              { translateY: walk.interpolate({ inputRange: [0, 1], outputRange: [0, RAIL_H] }) },
              // The head turns to face the walk: down while the story moves
              // on, up when walking back, up on arrival (its natural pose).
              { rotate: facing.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
            ],
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
            color: t.inkSlate,
            fontVariant: ['tabular-nums'],
          }}
        >
          {/* Derived, never hard-coded — the story grew to 7 chapters and the
              fixed "/06" printed 07/06 (rulebook pass). */}
          {String(index + 1).padStart(2, '0')}/{String(CHAPTERS.length).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}
