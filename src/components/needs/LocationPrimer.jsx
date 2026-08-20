// The card that asks before the phone asks.
//
// iOS shows its location prompt ONCE per install. Spend it cold and a person
// who taps "Don't Allow" can never be asked again from inside the app; they
// would have to find it in iPhone Settings themselves, which the people
// Towinly is for will not do. So this card explains first, in plain words, and
// only the person tapping "Use my location" here spends that one chance.
//
// It also carries the two states that follow a refusal, because a screen that
// silently shows nothing is the thing an elder reads as "broken" (HCI 1), and
// because a refusal has to be reversible (HCI 3).
import { MapPin } from '../icons';
import { Text, View } from 'react-native';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TextLink from '../ui/TextLink';
import { STATUS } from '../../lib/deviceLocation';
import { useTheme } from '../../theme/ThemeContext';

// One entry per state the screen can be in. `action` null means the phone is
// the only thing that can change it now, so the card stops offering a button
// that cannot work.
const COPY = {
  [STATUS.unknown]: {
    title: 'See who is nearby',
    body: 'Towinly can use your location to show how far away each person is, and to show only people within the distance you choose. We save a rounded position, about a two kilometre area, never your address. Never while the app is closed.',
    action: 'Use my location',
  },
  [STATUS.refused]: {
    title: 'Distances are hidden',
    body: 'Without your location we cannot tell you how far away anyone is. You can still see everyone below, and you can turn this on whenever you like.',
    action: 'Use my location',
  },
  [STATUS.blocked]: {
    title: 'Location is turned off for Towinly',
    body: 'To show distances again, open Settings on your phone, find Towinly, and turn Location on. Everyone below still shows without it.',
    action: null,
  },
  [STATUS.off]: {
    title: 'Location is turned off on this phone',
    body: 'Turn Location on in your phone settings and Towinly can show how far away each person is. Everyone below still shows without it.',
    action: null,
  },
};

export default function LocationPrimer({ status, busy, onEnable, onDismiss }) {
  const { t, spacing, type, text } = useTheme();
  const copy = COPY[status];
  // allowed / unsupported: nothing to say, so nothing is shown.
  if (!copy) return null;

  return (
    <Card style={{ marginBottom: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <MapPin size={18} color={t.blueDeep} strokeWidth={2} />
        <Text
          accessibilityRole="header"
          style={{ fontSize: type.cardTitle, fontWeight: '600', color: t.ink, flex: 1 }}
        >
          {copy.title}
        </Text>
      </View>
      <Text style={{ fontSize: text.base, color: t.inkSlate, lineHeight: 24, marginTop: spacing[2] }}>
        {copy.body}
      </Text>
      {copy.action ? (
        <Button
          title={busy ? 'Just a moment…' : copy.action}
          onPress={onEnable}
          loading={busy}
          disabled={busy}
          style={{ marginTop: spacing[3] }}
        />
      ) : null}
      {/* Always dismissible: finding a friend must never be gated behind
          handing over a position (HCI 3). */}
      {onDismiss ? (
        <TextLink label="Not now" muted onPress={onDismiss} style={{ marginTop: spacing[1] }} />
      ) : null}
    </Card>
  );
}
