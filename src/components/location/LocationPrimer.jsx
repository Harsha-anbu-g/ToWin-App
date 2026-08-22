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
//
// One card, four moments. `context` picks what this screen loses without a
// position, because "See who is nearby" means nothing to somebody who has just
// posted a help request. The 'find' sentences are owner-reviewed and asserted
// word for word by __tests__/location-primer.test.js: they do not change.
import { MapPin } from '../icons';
import { Text, View } from 'react-native';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TextLink from '../ui/TextLink';
import { STATUS } from '../../lib/deviceLocation';
import { useTheme } from '../../theme/ThemeContext';

// The three promises, said at the moment of asking rather than only in the
// policy: a rounded area, never an address, never while the app is closed.
// Every context repeats them word for word.
const PROMISE =
  'We save a rounded position, about a two kilometre area, never your address. Never while the app is closed.';

const SETTINGS_TITLE = 'Location is turned off for Towinly';
const PHONE_OFF_TITLE = 'Location is turned off on this phone';

// The person who moved this morning. Their saved position is hours old, so the
// quiet staleness refresh will not touch it, and only they know it is wrong.
// Said once, the same way on every screen, because it is about the account
// rather than about what this screen does. The title is the deliberate mirror
// of the profile refusal ("Your position comes from the town you type"), so the
// two states read as the same sentence with the source swapped.
const SET_TITLE = 'Your position comes from your phone';
const SET_ACTION = 'Update my location';

// Per screen: what it can do with a position, and what still works without one.
// `stillWorks` ends every refusal state, so nobody is left thinking the screen
// broke when they said no (HCI 1, HCI 9).
const CONTEXTS = {
  find: {
    askTitle: 'See who is nearby',
    why: 'Towinly can use your location to show how far away each person is, and to show only people within the distance you choose.',
    refusedTitle: 'Distances are hidden',
    refusedBody:
      'Without your location we cannot tell you how far away anyone is. You can still see everyone below, and you can turn this on whenever you like.',
    blockedLead: 'To show distances again, open Settings on your phone, find Towinly, and turn Location on.',
    offClause: 'Towinly can show how far away each person is.',
    stillWorks: 'Everyone below still shows without it.',
  },
  post: {
    askTitle: 'Let helpers see how far away you are',
    why: 'Towinly can use your location so helpers nearby see how far away you are, instead of the town you typed when you joined.',
    refusedTitle: 'Helpers cannot see how far away you are',
    refusedBody:
      'Without your location your request shows the town you typed, so a helper on your street looks no closer than one across town. Helpers still see it, and you can turn this on whenever you like.',
    blockedLead:
      'To show helpers how far away you are, open Settings on your phone, find Towinly, and turn Location on.',
    offClause: 'helpers nearby can see how far away you are.',
    stillWorks: 'Your request still shows without it.',
  },
  offer: {
    askTitle: 'See how far away each request is',
    why: 'Towinly can use your location to show how far away each request is, and to show only the requests within the distance you choose.',
    refusedTitle: 'Distances are hidden',
    refusedBody:
      'Without your location we cannot tell you how far away a request is, and the distance you pick cannot be used. Every open request still shows, and you can turn this on whenever you like.',
    blockedLead: 'To sort by distance, open Settings on your phone, find Towinly, and turn Location on.',
    offClause: 'Towinly can show how far away each request is.',
    stillWorks: 'Every open request still shows without it.',
  },
  profile: {
    askTitle: 'Use your phone instead of a typed town',
    why: 'Towinly can use your location to set where you are, instead of the middle of the town you type.',
    refusedTitle: 'Your position comes from the town you type',
    refusedBody:
      'Without your location Towinly looks up the town in the box above and uses the middle of it. That still works, and you can turn this on whenever you like.',
    blockedLead:
      'To use your phone instead of a typed town, open Settings on your phone, find Towinly, and turn Location on.',
    offClause: 'Towinly can set where you are from your phone.',
    stillWorks: 'The town you type still works without it.',
  },
};

// One entry per state the screen can be in. `action` null means the phone is
// the only thing that can change it now, so the card stops offering a button
// that cannot work.
const copyFor = (context, status, canRefresh) => {
  const c = CONTEXTS[context] ?? CONTEXTS.find;
  switch (status) {
    case STATUS.allowed:
      // Only where the screen handed us a way to read again. The browse screens
      // pass none, so somebody with a position still sees no card there.
      return canRefresh
        ? { title: SET_TITLE, body: `${PROMISE} Update it if you have moved.`, action: SET_ACTION }
        : null;
    case STATUS.unknown:
      return { title: c.askTitle, body: `${c.why} ${PROMISE}`, action: 'Use my location' };
    case STATUS.refused:
      return { title: c.refusedTitle, body: c.refusedBody, action: 'Use my location' };
    case STATUS.blocked:
      return { title: SETTINGS_TITLE, body: `${c.blockedLead} ${c.stillWorks}`, action: null };
    case STATUS.off:
      return {
        title: PHONE_OFF_TITLE,
        body: `Turn Location on in your phone settings and ${c.offClause} ${c.stillWorks}`,
        action: null,
      };
    // unsupported: nothing to say, so nothing is shown.
    default:
      return null;
  }
};

/**
 * @param {object} props
 * @param {string} props.status one of STATUS
 * @param {boolean} [props.busy]
 * @param {'find'|'post'|'offer'|'profile'} [props.context] what this screen loses without a position
 * @param {'primary'|'secondary'} [props.actionVariant] secondary where the screen
 *   already owns its one filled sky-blue button
 * @param {() => void} props.onEnable
 * @param {() => void} [props.onDismiss]
 * @param {() => void} [props.onRefresh] read the phone again. Passing it is what
 *   turns the card on for somebody who already has a position and has moved.
 */
export default function LocationPrimer({
  status,
  busy,
  context = 'find',
  actionVariant = 'primary',
  onEnable,
  onDismiss,
  onRefresh,
}) {
  const { t, spacing, type, text } = useTheme();
  const copy = copyFor(context, status, !!onRefresh);
  if (!copy) return null;
  // With a position there is nothing left to ask for, so the button reads
  // again instead. Nothing here can prompt: permission is already granted.
  const onAction = status === STATUS.allowed ? onRefresh : onEnable;

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
          onPress={onAction}
          variant={actionVariant}
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
