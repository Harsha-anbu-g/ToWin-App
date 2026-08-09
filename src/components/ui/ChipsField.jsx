// Chips editor for comma-list fields (the deferred rulebook item): each entry
// becomes a removable chip instead of asking elders to hand-maintain comma
// punctuation (recognition over recall; Postel — commas, Enter, and pasted
// lists all still work). Drop-in for Input on list fields: `value` stays the
// same comma-joined string the form already holds, so populate/save/dirty
// logic in the caller never changes.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme/ThemeContext';
import Input from './Input';

const parseList = (s) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function ChipsField({ label, value, onChangeText, helper, style }) {
  const { t, type, radius, fontScaleCaps, pressRipple } = useTheme();
  const items = parseList(value);
  const [draft, setDraft] = useState('');

  const commit = (text) => {
    const fresh = parseList(text).filter(
      (add) => !items.some((have) => have.toLowerCase() === add.toLowerCase())
    );
    setDraft('');
    if (!fresh.length) return;
    haptic.selection();
    onChangeText([...items, ...fresh].join(', '));
  };

  // A typed comma commits immediately — the habit the old field taught
  // keeps working here (Postel's Law).
  const onChangeDraft = (v) => (v.includes(',') ? commit(v) : setDraft(v));

  const remove = (idx) => {
    haptic.selection();
    onChangeText(items.filter((_, i) => i !== idx).join(', '));
  };

  return (
    <View style={style}>
      {items.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {items.map((item, idx) => (
            <Pressable
              key={`${item}-${idx}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
              onPress={() => remove(idx)}
              android_ripple={pressRipple}
              // No hitSlop: the box itself clears 44pt both ways, and removal is
              // destructive — slop would eat the 8pt wrap gap and let a
              // near-miss delete the neighbouring entry.
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: t.blueSoft,
                backgroundColor: pressed ? t.surface2 : t.blueWash,
              })}
            >
              <Text maxFontSizeMultiplier={fontScaleCaps.body} style={{ fontSize: type.meta, color: t.ink }}>
                {item}
              </Text>
              <X size={14} color={t.inkSlate} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Input
        label={label}
        value={draft}
        onChangeText={onChangeDraft}
        helper={helper}
        onSubmitEditing={() => commit(draft)}
        onBlur={() => commit(draft)}
        submitBehavior="submit"
        returnKeyType="done"
        autoCapitalize="none"
      />
    </View>
  );
}
