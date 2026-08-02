// What is actually in her Sealed box.
//
// The top line counts, and says who can see it, in one sentence: "Your box is
// shut. 3 things are inside. Nobody can see them but you." An elder who has
// just written down where her money is comes back to check it is still true,
// and the answer has to be the first thing on the screen.
//
// Nothing here holds a decrypted word — each card asks for the password itself
// and keeps what comes back in its own state.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SEALED_ITEMS } from '../../lib/passOnLocks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import SealedItemCard from './SealedItemCard';
import SealedItemForm from './SealedItemForm';

/**
 * Props:
 *   items    — [{ id, label, kindHint }] names only, as the server returned them
 *   saving   — true while a save is in flight
 *   releaseContactEmail — passed to the cards for the frozen refusal only
 *   onAdd({ label, body, kindHint }) → Promise, resolving when saved
 *   onRemove(item)
 *   onReveal(item, password) → Promise<{ label, body }>
 */
export default function SealedItems({
  items,
  saving,
  releaseContactEmail,
  onAdd,
  onRemove,
  onReveal,
}) {
  const { t, text, radius, spacing } = useTheme();
  const [adding, setAdding] = useState(false);
  const inside = items || [];

  // The form closes only on a save that worked. A failed save leaves it open
  // with every word still in it — she has just typed out where her money is,
  // and clearing the screen would ask her to write it again from memory.
  async function save(payload) {
    try {
      await onAdd(payload);
      setAdding(false);
    } catch {
      // Already said out loud by the screen that made the call.
    }
  }

  return (
    <View accessibilityLabel="What is in your sealed box" style={{ gap: spacing[3] }}>
      {/* Something to read and be reassured by, not something to act on — a
          quiet line in the trust wash, never a tappable-looking panel. */}
      <Text
        style={{
          fontSize: text.sm,
          color: t.inkSlate,
          lineHeight: 24,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          backgroundColor: t.greenTint,
          borderWidth: 1,
          borderColor: t.hairline2,
          borderRadius: radius.lg,
        }}
      >
        {inside.length === 0 ? SEALED_ITEMS.nothingInside : SEALED_ITEMS.shut(inside.length)}
      </Text>

      {inside.map((item) => (
        <SealedItemCard
          key={item.id}
          item={item}
          releaseContactEmail={releaseContactEmail}
          onRemove={onRemove}
          onReveal={onReveal}
        />
      ))}

      {adding ? (
        <SealedItemForm saving={saving} onSave={save} onCancel={() => setAdding(false)} />
      ) : (
        <Button
          title={SEALED_ITEMS.add}
          onPress={() => setAdding(true)}
          style={{ alignSelf: 'flex-end' }}
        />
      )}
    </View>
  );
}
