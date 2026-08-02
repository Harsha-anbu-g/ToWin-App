// Putting one thing into the Sealed box.
//
// The name is asked for with its promise attached — "Nobody else ever sees
// this name" is what the database does; there is no readable label column.
//
// Nothing is edited afterwards. There is no change flow here on purpose: an
// edit would have to decrypt, show and re-encrypt, which is a second path that
// displays a secret. She takes it out and puts a new one in.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SEALED_ITEMS, SEALED_KINDS } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import Input from '../ui/Input';

/**
 * Props:
 *   saving — disables the buttons while the save is in flight
 *   onSave({ label, body, kindHint })
 *   onCancel()
 */
export default function SealedItemForm({ saving, onSave, onCancel }) {
  const { t, text, spacing } = useTheme();
  const [label, setLabel] = useState('');
  const [body, setBody] = useState('');
  const [kindHint, setKindHint] = useState(null);
  const [problem, setProblem] = useState('');

  function submit() {
    if (!label.trim()) return setProblem(SEALED_ITEMS.needsName);
    if (!body.trim()) return setProblem(SEALED_ITEMS.needsBody);
    // Asked for rather than defaulted: the chip is the one readable thing
    // about the item and it ends up on the copy her family reads.
    if (!kindHint) return setProblem(SEALED_ITEMS.needsKind);
    setProblem('');
    onSave({ label: label.trim(), body: body.trim(), kindHint });
  }

  return (
    <Card contentStyle={{ gap: spacing[4] }}>
      <View style={{ gap: spacing[2] }}>
        <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 22 }}>
          {SEALED_ITEMS.nameHelp}
        </Text>
        <Input
          label={SEALED_ITEMS.namePrompt}
          value={label}
          onChangeText={setLabel}
          placeholder={SEALED_ITEMS.namePlaceholder}
          maxLength={120}
        />
      </View>

      <Input
        label={SEALED_ITEMS.bodyPrompt}
        value={body}
        onChangeText={setBody}
        maxLength={20000}
        multiline
        inputStyle={{ minHeight: 150 }}
      />

      <View>
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 10 }}>
          {SEALED_ITEMS.kindPrompt}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={SEALED_ITEMS.kindPrompt}
          style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}
        >
          {Object.keys(SEALED_KINDS).map((key) => (
            <Chip
              key={key}
              label={SEALED_KINDS[key]}
              selected={kindHint === key}
              onPress={() => setKindHint(key)}
            />
          ))}
        </View>
      </View>

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
          title={saving ? SEALED_ITEMS.saving : SEALED_ITEMS.save}
          onPress={submit}
          loading={saving}
        />
        <Button title={SEALED_ITEMS.cancel} variant="secondary" onPress={onCancel} disabled={saving} />
      </View>
    </Card>
  );
}
