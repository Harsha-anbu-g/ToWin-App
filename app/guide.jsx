// How ToWin works — mobile port of the Guide (guideContent.jsx), with the same
// role toggle and plain-English copy. One idea per section.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';

const ELDER_CAN = [
  'Post a help request for company, a ride, shopping, cleaning, and more.',
  'See the helpers who apply and choose the person you trust.',
  'Find and connect with helpers near you.',
  'Message the people you connect with, safely and simply.',
  'Check in every day to keep your daily streak going.',
  'Add emergency contacts so the people you trust are easy to reach.',
];

const HELPER_CAN = [
  'See help requests from elders near you and apply to the ones you can do.',
  'Find elders looking for friendship and send a friend request.',
  'Message the elders you connect with, safely and simply.',
  'Grow your Trust Score and earn reviews each time you help.',
];

const LADDER = [
  ['Just connected', 'You said yes to each other. Chat inside ToWin only.'],
  ['Chatting', 'Regular messages — getting to know each other.'],
  ['Friendly', 'First names and warm conversation come naturally.'],
  ['Phone ready', 'You both agreed to share phone numbers.'],
  ['Met in person', 'A first meeting in a public place went well.'],
  ['Helping hand', 'Real help happens — errands, rides, company.'],
  ['Fully trusted', 'The top of the ladder. Trust earned one step at a time.'],
];

function Bullets({ items }) {
  const { t, spacing, text } = useTheme();
  return (
    <View style={{ gap: spacing[2], marginTop: spacing[3] }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Text style={{ color: t.blueDeep, fontSize: text.base, lineHeight: 26 }}>•</Text>
          <Text style={{ flex: 1, fontSize: text.base, lineHeight: 26, color: t.ink2 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Module-scope like Bullets (NOT defined during render): a new component type
// per render would unmount/remount every heading and paragraph subtree on
// each role toggle.
function H({ children }) {
  const { t, text, fontFamily } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
    >
      {children}
    </Text>
  );
}
function P({ children, style }) {
  const { t, text, spacing } = useTheme();
  return (
    <Text style={[{ fontSize: text.base, lineHeight: 27, color: t.inkSlate, marginTop: spacing[2] }, style]}>
      {children}
    </Text>
  );
}

export default function Guide() {
  const { t, spacing, radius, text } = useTheme();
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role === 'HELPER' ? 'HELPER' : 'ELDER');

  return (
    <Screen back title="How ToWin works">
      <Card>
        <H>Welcome to ToWin</H>
        <P>
          ToWin is a community that brings older people and younger helpers together, so no one
          feels alone and everyday help is easy to find.
        </P>
        <P>
          Many older people have no safe, trusted way to meet new friends or get a hand with daily
          tasks. ToWin gives them one, built around trust that grows one small step at a time — so
          no one ever has to rush or feel unsafe.
        </P>
      </Card>

      <Card style={{ marginTop: spacing[4] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] }}>
          {['ELDER', 'HELPER'].map((r) => {
            const active = role === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setRole(r)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: active ? 2 : 1.5,
                  borderColor: active ? t.blue : t.border,
                  backgroundColor: active ? t.blueWash : t.canvas,
                }}
              >
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: active ? t.blueDeep : t.ink3 }}>
                  {r === 'ELDER' ? 'As an Elder' : 'As a Helper'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <H>What you can do</H>
        <Bullets items={role === 'HELPER' ? HELPER_CAN : ELDER_CAN} />
      </Card>

      <Card style={{ marginTop: spacing[4] }}>
        <H>
          How <Text style={{ color: t.trustGold }}>trust</Text> grows
        </H>
        <P>
          Trust is earned one step at a time on a seven-step ladder. Every step needs BOTH of you
          to agree — nobody can rush it.
        </P>
        <View style={{ marginTop: spacing[3], gap: spacing[3] }}>
          {LADDER.map(([stage, desc], i) => (
            <View key={stage} style={{ flexDirection: 'row', gap: spacing[3] }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: t.surfaceFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: t.inkSlate, fontVariant: ['tabular-nums'] }}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>{stage}</Text>
                <Text style={{ fontSize: text.sm, lineHeight: 21, color: t.inkSlate, marginTop: 1 }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing[4] }}>
        <H>Staying safe</H>
        <Bullets
          items={[
            'Phone numbers are shared only when you both reach the Phone Ready step.',
            'Meet in public places for first meetings.',
            'Elders can keep emergency contacts — the people to call when something happens.',
            'You can report anyone from their profile; our team reviews every report.',
          ]}
        />
      </Card>
    </Screen>
  );
}
