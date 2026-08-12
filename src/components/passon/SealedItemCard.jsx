// One thing in her Sealed box, as it sits on her own screen.
//
// There is no preview, and there is no way to add one — the list this card is
// built from carries a name, a chip and no body at all. The decrypted words
// exist on this screen for exactly as long as she is looking at them: they
// arrive from one call, live in this component's own state, and are gone the
// moment she taps [Hide this again] or leaves. Nothing is cached and nothing
// is lifted into the page above (web SealedItemCard parity).
//
// Every refusal is the server's own sentence — the seven-day freeze carries a
// real date she may act on. The screen adds one thing to the freeze: somebody
// to write to.
import { Lock } from '../icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { FROZEN, SEALED_ITEMS, SEALED_KINDS } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import PasswordInput from '../ui/PasswordInput';

/**
 * Props:
 *   item      — { id, label, kindHint }
 *   releaseContactEmail — where to write, from the server; nothing when unset
 *   onRemove(item)
 *   onReveal(item, password) → Promise<{ label, body }>, rejecting with the
 *                              server's refusal
 */
export default function SealedItemCard({ item, releaseContactEmail, onRemove, onReveal }) {
  const { t, text, type, fontFamily, radius, spacing } = useTheme();
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState('');
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState('');
  const [words, setWords] = useState(null);

  const isOpen = words !== null;

  /** Forgets the password the moment it has been used, whether it worked or not. */
  const closeUp = () => {
    setAsking(false);
    setPassword('');
    setProblem('');
  };

  async function open() {
    if (!password) return setProblem(SEALED_ITEMS.needsPassword);
    setProblem('');
    setOpening(true);
    try {
      const opened = await onReveal(item, password);
      setWords(opened?.body || '');
      closeUp();
    } catch (err) {
      setProblem(err?.response?.data?.message || SEALED_ITEMS.failedToOpen);
      setPassword('');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[3],
          flexWrap: 'wrap',
        }}
      >
        <Text
          style={{
            flex: 1,
            minWidth: 140,
            fontFamily: fontFamily.display,
            fontSize: text.base,
            color: t.ink,
            letterSpacing: -0.3,
          }}
        >
          {item.label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: radius.pill,
              paddingVertical: 4,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink3 }}>
              {SEALED_KINDS[item.kindHint] || SEALED_KINDS.OTHER}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {!isOpen ? <Lock size={14} color={t.ink3} strokeWidth={2.2} /> : null}
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink3 }}>
              {isOpen ? SEALED_ITEMS.unlocked : SEALED_ITEMS.locked}
            </Text>
          </View>
        </View>
      </View>

      {isOpen ? (
        <Text
          style={{
            fontSize: text.sm,
            color: t.ink,
            lineHeight: 26,
            marginTop: spacing[3],
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
            backgroundColor: t.greenTint,
            borderWidth: 1,
            borderColor: t.hairline2,
            borderRadius: radius.lg,
          }}
        >
          {words}
        </Text>
      ) : null}

      {asking && !isOpen ? (
        // Opens in place, under the card she asked about — a dialog would take
        // the name off the screen at the exact moment she has to decide.
        <View
          style={{
            marginTop: spacing[3],
            paddingTop: spacing[4],
            borderTopWidth: 1,
            borderTopColor: t.hairline,
            gap: spacing[3],
          }}
        >
          <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink }}>
            {SEALED_ITEMS.askPassword}
          </Text>
          {/* A family passphrase, not an account credential: textContentType
              "none" + autoComplete "off" keep password managers from saving
              it over the person's real Towinly login. */}
          <PasswordInput
            label={SEALED_ITEMS.passwordLabel}
            value={password}
            onChangeText={setPassword}
            textContentType="none"
            autoComplete="off"
          />
          {problem ? (
            <Text
              accessibilityRole="alert"
              style={{ fontSize: text.sm, fontWeight: '500', color: t.redDeep, lineHeight: 24 }}
            >
              {problem}
              {problem.startsWith(FROZEN.prefix)
                ? `\n${FROZEN.tellUs(releaseContactEmail)}`
                : ''}
            </Text>
          ) : null}
          <View style={{ gap: spacing[2] }}>
            {/* Outlined, not filled: the one filled button on this tab is
                [Put something in], and a second one appearing on a screen
                about somebody's death is the moment an older person stops. */}
            <Button
              title={opening ? SEALED_ITEMS.showing : SEALED_ITEMS.show}
              variant="secondary"
              onPress={open}
              loading={opening}
            />
            <Button
              title={SEALED_ITEMS.neverMind}
              variant="text"
              onPress={closeUp}
              disabled={opening}
            />
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4], flexWrap: 'wrap' }}>
        {!asking && !isOpen ? (
          <Button
            title={SEALED_ITEMS.see}
            variant="secondary"
            size="small"
            onPress={() => setAsking(true)}
          />
        ) : null}
        {isOpen ? (
          <Button
            title={SEALED_ITEMS.hide}
            variant="secondary"
            size="small"
            onPress={() => setWords(null)}
          />
        ) : null}
        <Button
          title={SEALED_ITEMS.remove}
          variant="secondary"
          size="small"
          onPress={() => onRemove(item)}
        />
      </View>
    </Card>
  );
}
