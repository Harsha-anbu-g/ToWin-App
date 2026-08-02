// Writing one story, or one letter — and changing one afterwards.
//
// It opens in place of the button that started it, so the form's own Save is
// the only filled button on the screen (web PassOnItemForm parity).
//
// A story picks its audience; a letter does not, because a letter goes to one
// person and only that person. A letter also picks when that person may read
// it, and a story never does. `releaseWhen` is sent on every letter and never
// left out: the server reads a missing one as "read it today", so a form that
// omitted it would quietly hand a held letter to a living person the next time
// she came back to fix a typo.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AUDIENCES, LETTERS, NOT_HERE, STORY_BOX } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import TextLink from '../ui/TextLink';
import PersonPicker from './PersonPicker';
import RadioCards from './RadioCards';

/**
 * Props:
 *   kind              — 'STORY' | 'LETTER'
 *   initial           — the item being changed, or null when writing a new one
 *   people            — [{ id, name, note }] for the person picker
 *   canHoldUntilGone  — whether her Sealed box is set up, and so whether anybody
 *                       could ever ask for a held letter to be opened
 *   saving            — disables the buttons while the save is in flight
 *   onSave({ kind, title, body, audience, audienceUserId, releaseWhen? })
 *   onCancel()
 *   onGoToSealedBox() — from the reason the hold is greyed out
 */
export default function PassOnItemForm({
  kind,
  initial,
  people,
  canHoldUntilGone,
  saving,
  onSave,
  onCancel,
  onGoToSealedBox,
}) {
  const { t, text, spacing, radius } = useTheme();
  const isLetter = kind === 'LETTER';
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [audience, setAudience] = useState(initial?.audience || (isLetter ? 'PERSON' : 'FAMILY'));
  const [personId, setPersonId] = useState(initial?.audienceUserId || null);
  const [releaseWhen, setReleaseWhen] = useState(initial?.releaseWhen || 'NOW');
  const [problem, setProblem] = useState('');

  const wantsPerson = isLetter || audience === 'PERSON';

  // A letter she is already holding stays offerable even with no Sealed box —
  // she can arm, write, then undo the setup; greying the choice out underneath
  // her would turn the letter she wrote for after her death into one her
  // daughter reads this afternoon, on a save she thought was a typo fix.
  const canHold = canHoldUntilGone || initial?.releaseWhen === 'AFTER';

  function submit() {
    if (!title.trim()) return setProblem('Please give it a name.');
    if (!body.trim())
      return setProblem(
        isLetter ? 'Please write something before you save it.' : 'Please tell it before you save it.'
      );
    if (wantsPerson && !personId) return setProblem('Please choose the one person this is for.');
    setProblem('');
    onSave({
      kind,
      title: title.trim(),
      body: body.trim(),
      audience: isLetter ? 'PERSON' : audience,
      audienceUserId: wantsPerson ? personId : null,
      // Letters only. A story is for people to read now, and asking the server
      // to hold one is the one request it answers with a refusal.
      ...(isLetter ? { releaseWhen: canHold ? releaseWhen : 'NOW' } : {}),
    });
  }

  return (
    <Card contentStyle={{ gap: spacing[4] }}>
      <Input
        label={STORY_BOX.namePrompt}
        value={title}
        onChangeText={setTitle}
        placeholder={isLetter ? 'For Sarah' : STORY_BOX.namePlaceholder}
        maxLength={120}
      />

      <Input
        label={isLetter ? LETTERS.bodyPrompt : STORY_BOX.bodyPrompt}
        value={body}
        onChangeText={setBody}
        maxLength={20000}
        multiline
        inputStyle={{ minHeight: 180 }}
      />

      {!isLetter ? (
        <Text style={{ fontSize: text.sm, color: t.trustGold, lineHeight: 23 }}>{NOT_HERE}</Text>
      ) : null}

      {!isLetter ? (
        <RadioCards
          prompt={STORY_BOX.audiencePrompt}
          options={AUDIENCES}
          value={audience}
          onChange={setAudience}
        />
      ) : null}

      {wantsPerson ? (
        <PersonPicker
          people={people}
          value={personId}
          onChange={setPersonId}
          label={LETTERS.personPrompt}
          emptyMessage={LETTERS.noneToWriteTo}
        />
      ) : null}

      {isLetter ? (
        <View style={{ gap: spacing[3] }}>
          <RadioCards
            prompt={LETTERS.whenPrompt}
            options={LETTERS.WHEN.map((o) =>
              o.key === 'AFTER' && !canHold ? { ...o, disabled: true } : o
            )}
            value={releaseWhen}
            onChange={setReleaseWhen}
          />
          {!canHold ? (
            // Why she cannot hold a letter yet, and the one place that changes
            // it — said out loud under the greyed-out card, never hidden.
            <View
              style={{
                backgroundColor: t.greenTint,
                borderWidth: 1,
                borderColor: t.greenLine,
                borderRadius: radius.lg,
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[4],
              }}
            >
              <Text style={{ fontSize: text.sm, color: t.ink, lineHeight: 23 }}>
                {LETTERS.needsKeyholders}
              </Text>
              <TextLink
                label={LETTERS.needsKeyholdersLink}
                onPress={onGoToSealedBox}
                style={{ alignSelf: 'flex-start', marginTop: 2 }}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {problem ? (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: text.sm, fontWeight: '500', color: t.redDeep }}
        >
          {problem}
        </Text>
      ) : null}

      <View style={{ gap: spacing[2] }}>
        <Button
          title={saving ? 'Saving…' : isLetter ? LETTERS.save : STORY_BOX.save}
          onPress={submit}
          loading={saving}
        />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
      </View>
    </Card>
  );
}
