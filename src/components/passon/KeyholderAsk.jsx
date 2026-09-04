// "Somebody has asked you to hold a key", on the family member's own screen.
//
// The only place in the app where a person is asked to take on a duty about
// somebody else's death, so three things are deliberate (web KeyholderAsk
// parity):
//
// **Both answers are ordinary buttons**, same size, side by side. A card that
// makes yes the easy path is how somebody agrees to something they did not
// want — the exact harm two-sided consent exists to prevent.
//
// **The numbers are real or absent.** Before the elder has chosen, the
// threshold sentence is not shown at all rather than guessed.
//
// **Nothing is shown until something is asked.** No heading, no empty state —
// a permanent reminder that a relative might one day ask about a death is not
// something to put on a family screen.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { listKeyholderAsksOfMe, respondToKeyholderAsk } from '../../api/passon';
import { KEYHOLDER_ASK } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

function AskCard({ ask, answered, error, sending, onAnswer }) {
  const { t, text, fontFamily, spacing } = useTheme();
  const name = ask.ownerName;
  const showThreshold = ask.approvalsNeeded > 0 && ask.keyholderCount > 0;

  return (
    <Card accessibilityLabel={KEYHOLDER_ASK.heading(name)} style={{ borderColor: t.greenLine }}>
      <Text
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, letterSpacing: -0.4 }}
      >
        {KEYHOLDER_ASK.heading(name)}
      </Text>

      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 25, marginTop: spacing[3] }}>
        {KEYHOLDER_ASK.body(name)}
      </Text>

      {showThreshold ? (
        <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 25, marginTop: 10 }}>
          {KEYHOLDER_ASK.threshold(ask.approvalsNeeded, ask.keyholderCount)}
        </Text>
      ) : null}

      {answered ? (
        <Text style={{ fontSize: text.sm, color: t.greenDeep, lineHeight: 25, marginTop: spacing[4] }}>
          {answered === 'accepted' ? KEYHOLDER_ASK.accepted(name) : KEYHOLDER_ASK.declined}
        </Text>
      ) : (
        <>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ fontSize: text.sm, fontWeight: '500', color: t.redDeep, marginTop: spacing[3] }}
            >
              {error}
            </Text>
          ) : null}
          {/* Same size, same weight, side by side. Neither answer is the easy one. */}
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
            <Button
              title={KEYHOLDER_ASK.yes}
              variant="secondary"
              onPress={() => onAnswer(ask, true)}
              disabled={sending}
              style={{ flex: 1 }}
            />
            <Button
              title={KEYHOLDER_ASK.no}
              variant="secondary"
              onPress={() => onAnswer(ask, false)}
              disabled={sending}
              style={{ flex: 1 }}
            />
          </View>
          <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 22, marginTop: spacing[3] }}>
            {KEYHOLDER_ASK.reassurance}
          </Text>
        </>
      )}
    </Card>
  );
}

export default function KeyholderAsk() {
  const { spacing } = useTheme();
  // Keyed by ask id: 'accepted' | 'declined'. The card stays put and changes
  // what it says rather than vanishing — somebody who just answered a
  // question about a death should get an acknowledgement, not an empty space.
  const [answered, setAnswered] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [errors, setErrors] = useState({});

  const { data: asks } = useQuery({
    queryKey: ['passon-asked-of-me'],
    // Quiet on failure on purpose. This sits on a screen whose real job is
    // "is Mum okay" — an error banner about a feature most people have never
    // heard of would only alarm.
    queryFn: async () => {
      const rows = await listKeyholderAsksOfMe();
      return Array.isArray(rows) ? rows : [];
    },
  });

  async function answer(ask, accept) {
    setSendingId(ask.id);
    setErrors((prev) => ({ ...prev, [ask.id]: null }));
    try {
      await respondToKeyholderAsk({ askId: ask.id, accept });
      setAnswered((prev) => ({ ...prev, [ask.id]: accept ? 'accepted' : 'declined' }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [ask.id]: err?.response?.data?.message || KEYHOLDER_ASK.failed,
      }));
    } finally {
      setSendingId(null);
    }
  }

  if (!asks || asks.length === 0) return null;

  return (
    <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
      {asks.map((ask) => (
        <AskCard
          key={ask.id}
          ask={ask}
          answered={answered[ask.id]}
          error={errors[ask.id]}
          sending={sendingId === ask.id}
          onAnswer={answer}
        />
      ))}
    </View>
  );
}
