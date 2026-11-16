// The one-time note about when points count (trust tiers step 1): a
// friendship adds to the score once the elder has ended a help between the
// two. It shows only when the server speaks that rule, which it does by
// sending `counted` on a friendship card; an older server sends none, and
// the note stays away. One flag for every place it is mounted (Home and the
// Trust Score page), so "Got it" on either puts both away.
import FirstTimeCard from '../ui/FirstTimeCard';
import { KEYS } from '../../lib/storageKeys';
import { tr } from '../../i18n';

/**
 * @param {{ customers?: Array<{counted?: boolean}>, onSeeScore?: () => void, style?: object }} props
 *   customers: the friendship cards from getMyTrustScore(); onSeeScore: when
 *   given, the note carries a "See your score" link (Home).
 */
export default function TrustRuleNote({ customers, onSeeScore, style }) {
  const speaksRule = (customers ?? []).some((c) => typeof c.counted === 'boolean');
  if (!speaksRule) return null;
  return (
    <FirstTimeCard
      flag={KEYS.trustRuleExplained}
      title={tr('Points count after a help is finished')}
      body={tr('A friendship adds to your score once a help between you two is finished. If your score went down, this is why.')}
      linkTitle={onSeeScore ? tr('See your score') : undefined}
      onLink={onSeeScore}
      style={style}
    />
  );
}
