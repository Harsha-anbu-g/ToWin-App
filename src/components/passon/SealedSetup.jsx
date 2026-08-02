// Setting the Sealed box up, in three steps.
//
// Two rules here are worth more than the layout (web SealedSetup parity):
//
// **Nothing leaves until the last button.** Who she picked, how many must
// agree and the two acknowledgements all travel in one call at the end — an
// elder who opened this out of curiosity and backed out at step two has asked
// three relatives nothing about her own death.
//
// **The two ticked sentences come from the server and go straight back.** The
// server stores a hash of the exact wording shown and refuses any wording it
// does not publish, so this file must never hold its own copy of them.
import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SETUP, listOfNames } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TextLink from '../ui/TextLink';

const SMALLEST_POOL = 3;
const LARGEST_POOL = 5;
const STEPS = 3;

/** A drawn square marker on a whole-row target — hands that shake never aim at 20px. */
function TickMark({ checked }) {
  const { t } = useTheme();
  return (
    <View
      aria-hidden
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: checked ? t.trustGold : t.border,
        backgroundColor: checked ? t.trustGold : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Check size={15} color={t.actionInk} strokeWidth={3} /> : null}
    </View>
  );
}

/** One person, as a whole tappable row — the row is the target, the box the marker. */
function PersonTick({ person, checked, disabled, onToggle }) {
  const { t, text, type, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={person.note ? `${person.name}, ${person.note}` : person.name}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        minHeight: 60,
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[4],
        borderRadius: radius.lg,
        backgroundColor: checked ? t.greenTint : t.canvas,
        borderWidth: 1,
        borderColor: checked ? t.trustGold : t.hairline2,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <TickMark checked={checked} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: text.sm, color: t.ink }}>{person.name}</Text>
        {person.note ? (
          <Text style={{ fontSize: type.meta, color: t.ink3, marginTop: 2 }}>{person.note}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** One of the two sentences whose exact wording is stored against her name. */
function Ack({ checked, onToggle, children }) {
  const { t, text, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={children}
      accessibilityState={{ checked }}
      onPress={() => onToggle(!checked)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[3],
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.hairline2,
        backgroundColor: t.canvas,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ marginTop: 2 }}>
        <TickMark checked={checked} />
      </View>
      <Text style={{ flex: 1, fontSize: text.sm, color: t.ink, lineHeight: 23 }}>{children}</Text>
    </Pressable>
  );
}

/** A wall, said in words, with the way through it when there is one. */
function Blocked({ message, to, label }) {
  const { t, text, radius, spacing } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        backgroundColor: t.greenTint,
        borderWidth: 1,
        borderColor: t.trustGold,
        borderRadius: radius.lg,
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[5],
      }}
    >
      <Text style={{ fontSize: text.sm, color: t.ink, lineHeight: 24 }}>{message}</Text>
      {to ? (
        <TextLink
          label={label}
          onPress={() => router.push(to)}
          style={{ alignSelf: 'flex-start', marginTop: 6 }}
        />
      ) : null}
    </View>
  );
}

/**
 * Props:
 *   family  — [{ id, name, note }], her family list; Keyholders come from nowhere else
 *   setup   — the server's setup state, including the two sentences and what
 *             would stop her finishing
 *   already — the people already standing, pre-ticked when she comes back to change it
 *   saving  — true while the finish call is in flight
 *   onFinish({ personIds, approvalsNeeded, notAWillAck, keyTruthAck })
 *   onCancel()
 */
export default function SealedSetup({ family, setup, already = [], saving, onFinish, onCancel }) {
  const { t, text, type, fontFamily, radius, spacing } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(1);
  // Kept in the order she tapped them, which is the order they are asked in.
  const [picked, setPicked] = useState(() => already.filter((id) => family.some((p) => p.id === id)));
  const [approvals, setApprovals] = useState(setup?.approvalsNeeded || 2);
  const [notAWill, setNotAWill] = useState(false);
  const [keyTruth, setKeyTruth] = useState(false);

  const enoughPeople = family.length >= SMALLEST_POOL;
  const chosen = useMemo(
    () => picked.map((id) => family.find((p) => p.id === id)).filter(Boolean),
    [picked, family]
  );

  // Never fewer than two, and never all of them: the first Keyholder who is
  // unreachable would otherwise keep the box shut forever.
  const workableNumbers = useMemo(() => {
    const numbers = [];
    for (let n = 2; n <= picked.length - 1; n += 1) numbers.push(n);
    return numbers;
  }, [picked.length]);

  const mustAgree = workableNumbers.includes(approvals) ? approvals : workableNumbers[0] || 2;
  const canFinish = setup?.emailConfirmed && setup?.hasPassword && notAWill && keyTruth && !saving;

  const toggle = (id) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id]
    );

  const finish = () =>
    onFinish({
      personIds: picked,
      approvalsNeeded: mustAgree,
      // Straight back out, untouched — see the note at the top of this file.
      notAWillAck: setup.notAWillAck,
      keyTruthAck: setup.keyTruthAck,
    });

  const stepTitle = step === 1 ? SETUP.who.title : step === 2 ? SETUP.howMany.title : SETUP.before.title;
  const stepBlurb = step === 1 ? SETUP.who.blurb : step === 2 ? SETUP.howMany.blurb : null;

  return (
    <Card accessibilityLabel="Setting up your sealed box" contentStyle={{ gap: spacing[4] }}>
      <View>
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink3, letterSpacing: 0.3 }}>
          {SETUP.step(step, STEPS)}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: text.lg,
            color: t.ink,
            letterSpacing: -0.4,
            marginTop: 10,
          }}
        >
          {stepTitle}
        </Text>
        {stepBlurb ? (
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 10 }}>
            {stepBlurb}
          </Text>
        ) : null}
      </View>

      {step === 1 &&
        (!enoughPeople ? (
          <View>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24 }}>
              {SETUP.who.tooFew}
            </Text>
            <TextLink
              label={SETUP.who.tooFewLink}
              onPress={() => router.push('/family')}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            />
          </View>
        ) : (
          <View style={{ gap: spacing[2] }}>
            {family.map((person) => (
              <PersonTick
                key={person.id}
                person={person}
                checked={picked.includes(person.id)}
                // Five is the whole pool, so this can only bind if that cap moves.
                disabled={!picked.includes(person.id) && picked.length >= LARGEST_POOL}
                onToggle={() => toggle(person.id)}
              />
            ))}
            <Text style={{ fontSize: type.meta, color: t.ink3, lineHeight: 20, marginTop: spacing[2] }}>
              {SETUP.who.nothingSentYet}
            </Text>
          </View>
        ))}

      {step === 2 && (
        <View>
          {workableNumbers.length > 1 ? (
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={SETUP.howMany.title}
              style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}
            >
              {workableNumbers.map((n) => {
                const on = n === mustAgree;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="radio"
                    accessibilityLabel={`${n}`}
                    accessibilityState={{ checked: on }}
                    onPress={() => setApprovals(n)}
                    style={({ pressed }) => ({
                      minWidth: 60,
                      minHeight: 60,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? t.greenTint : t.canvas,
                      borderWidth: 1,
                      borderColor: on ? t.trustGold : t.hairline2,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '600',
                        color: on ? t.ink : t.inkSlate,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {/* Rebuilt from her real names every time it is drawn — a worked
              example with invented names is the one thing this must never contain. */}
          <Text
            style={{
              fontSize: text.sm,
              color: t.ink,
              lineHeight: 24,
              marginTop: spacing[4],
              paddingLeft: spacing[3],
              borderLeftWidth: 2,
              borderLeftColor: t.trustGold,
            }}
          >
            {SETUP.howMany.inRealTerms(mustAgree, listOfNames(chosen.map((p) => p.name)), chosen.length)}
          </Text>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: spacing[4] }}>
          {/* Both gates are hard: no finish button exists while either is unmet. */}
          {!setup.emailConfirmed ? (
            <Blocked
              message={SETUP.before.confirmEmail}
              to="/(tabs)/profile"
              label={SETUP.before.confirmEmailLink}
            />
          ) : null}
          {setup.emailConfirmed && !setup.hasPassword ? (
            <Blocked message={SETUP.before.needsPassword} />
          ) : null}

          {setup.emailConfirmed && setup.hasPassword ? (
            <>
              <View>
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink }}>
                  {SETUP.before.saveHeading}
                </Text>
                <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24, marginTop: 8 }}>
                  {SETUP.before.save}
                </Text>
              </View>
              <View style={{ gap: spacing[2] }}>
                <Ack checked={notAWill} onToggle={setNotAWill}>
                  {setup.notAWillAck}
                </Ack>
                <Ack checked={keyTruth} onToggle={setKeyTruth}>
                  {setup.keyTruthAck}
                </Ack>
              </View>
            </>
          ) : null}
        </View>
      )}

      <View
        style={{
          gap: spacing[2],
          paddingTop: spacing[4],
          borderTopWidth: 1,
          borderTopColor: t.hairline,
        }}
      >
        {step < STEPS ? (
          <Button
            title={SETUP.next}
            onPress={() => setStep((s) => s + 1)}
            disabled={step === 1 && picked.length < SMALLEST_POOL}
          />
        ) : null}
        {step === STEPS && setup.emailConfirmed && setup.hasPassword ? (
          <Button title={SETUP.finish} onPress={finish} disabled={!canFinish} loading={saving} />
        ) : null}
        {step > 1 ? (
          <Button title={SETUP.back} variant="secondary" onPress={() => setStep((s) => s - 1)} />
        ) : null}
        <Button title={SETUP.cancel} variant="secondary" onPress={onCancel} />
      </View>
    </Card>
  );
}
