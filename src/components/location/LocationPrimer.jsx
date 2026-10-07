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
import { tr } from '../../i18n';

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
    get askTitle() { return tr('See who is nearby'); },
    get why() { return tr('Towinly can use your location to show how far away each person is, and to show only people within the distance you choose.'); },
    get refusedTitle() { return tr('Distances are hidden'); },
    get refusedBody() { return tr('Without your location we cannot tell you how far away anyone is. You can still see everyone below, and you can turn this on whenever you like.'); },
    get blockedLead() { return tr('To show distances again, open Settings on your phone, find Towinly, and turn Location on.'); },
    get offClause() { return tr('Towinly can show how far away each person is.'); },
    get stillWorks() { return tr('Everyone below still shows without it.'); },
  },
  post: {
    get askTitle() { return tr('Let helpers see how far away you are'); },
    get why() { return tr('Towinly can use your location so helpers nearby see how far away you are, instead of the town you typed when you joined.'); },
    get refusedTitle() { return tr('Helpers cannot see how far away you are'); },
    get refusedBody() { return tr('Without your location your request shows the town you typed, so a helper on your street looks no closer than one across town. Helpers still see it, and you can turn this on whenever you like.'); },
    get blockedLead() { return tr('To show helpers how far away you are, open Settings on your phone, find Towinly, and turn Location on.'); },
    get offClause() { return tr('helpers nearby can see how far away you are.'); },
    get stillWorks() { return tr('Your request still shows without it.'); },
  },
  offer: {
    get askTitle() { return tr('See how far away each request is'); },
    get why() { return tr('Towinly can use your location to show how far away each request is, and to show only the requests within the distance you choose.'); },
    get refusedTitle() { return tr('Distances are hidden'); },
    get refusedBody() { return tr('Without your location we cannot tell you how far away a request is, and the distance you pick cannot be used. Every open request still shows, and you can turn this on whenever you like.'); },
    get blockedLead() { return tr('To sort by distance, open Settings on your phone, find Towinly, and turn Location on.'); },
    get offClause() { return tr('Towinly can show how far away each request is.'); },
    get stillWorks() { return tr('Every open request still shows without it.'); },
  },
  profile: {
    get askTitle() { return tr('Use your phone instead of a typed town'); },
    get why() { return tr('Towinly can use your location to set where you are, instead of the middle of the town you type.'); },
    get refusedTitle() { return tr('Your position comes from the town you type'); },
    get refusedBody() { return tr('Without your location Towinly looks up the town in the box above and uses the middle of it. That still works, and you can turn this on whenever you like.'); },
    get blockedLead() { return tr('To use your phone instead of a typed town, open Settings on your phone, find Towinly, and turn Location on.'); },
    get offClause() { return tr('Towinly can set where you are from your phone.'); },
    get stillWorks() { return tr('The town you type still works without it.'); },
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
        ? { title: tr(SET_TITLE), body: tr('{promise} Update it if you have moved.', { promise: tr(PROMISE) }), action: tr(SET_ACTION) }
        : null;
    case STATUS.unknown:
      return { title: c.askTitle, body: `${c.why} ${tr(PROMISE)}`, action: tr('Use my location') };
    case STATUS.refused:
      return { title: c.refusedTitle, body: c.refusedBody, action: tr('Use my location') };
    case STATUS.blocked:
      return { title: tr(SETTINGS_TITLE), body: `${c.blockedLead} ${c.stillWorks}`, action: null };
    case STATUS.off:
      return {
        title: tr(PHONE_OFF_TITLE),
        body: tr('Turn Location on in your phone settings and {offClause} {stillWorks}', { offClause: c.offClause, stillWorks: c.stillWorks }),
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
          title={busy ? tr('Just a moment…') : copy.action}
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
        <TextLink label={tr('Not now')} muted onPress={onDismiss} style={{ marginTop: spacing[1] }} />
      ) : null}
    </Card>
  );
}
