// Guardian mode (LEAVE_REVIEWS, FAM-509): the family member writes a review
// of a helper for the parent.
//
// The review belongs to the parent — it is their friendship and their trust
// the helper earns. The family member's name rides along so nobody is ever
// reviewed by a stranger wearing someone else's face. Reviewing is the reward
// at the top of the ladder, so this only appears on a fully trusted
// friendship, exactly as it does for the parent themselves.
import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { TRUSTED_STAGE, stageIndexOf } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import Input from '../ui/Input';

// The one place a star glyph is allowed — it IS the rating, not decoration.
// Same fill convention as the feedback screen: trustGold filled, idleGrey empty.
function StarPicker({ question, value, onChange }) {
  const { t } = useTheme();
  return (
    // The question labels the group (the same words drawn above it), and only
    // the chosen star is checked — `n <= value` fills the row, it does not
    // answer it (same rule as the feedback screen's RatingRow).
    <View accessibilityRole="radiogroup" accessibilityLabel={question} style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
          aria-checked={n === value}
          onPress={() => onChange(n)}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Star
            size={26}
            color={n <= value ? t.trustGold : t.idleGrey}
            fill={n <= value ? t.trustGold : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function FamilyReviewForParent({ helper, elderId, elderName }) {
  const { t, spacing, radius, type } = useTheme();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const parent = elderName || 'your parent';
  const firstName = (helper?.helperName || 'them').split(' ')[0];
  // Written once: it is drawn above the stars and it is also what labels them
  // for a screen reader, and those two must never drift apart.
  const question = `How has ${firstName} been for ${parent}?`;

  const save = useMutation({
    mutationFn: () =>
      api.post('/reviews', {
        revieweeId: helper.helperUserId,
        rating,
        comment: comment.trim() || null,
        // We ask; the server checks the parent's grant and records who wrote it.
        onBehalfOfElderId: elderId,
      }),
    onSuccess: () => {
      setDone(true);
      setOpen(false);
      showToast(`Review saved for ${parent}. ${firstName} will see you wrote it.`, 'success');
    },
    onError: (err) =>
      setErrMsg(err?.response?.data?.message || 'Could not save that review. Please try again.'),
  });

  // Only a fully trusted friendship can be reviewed — the same gate the
  // parent and the helper live under, and the server holds it too.
  if (stageIndexOf(helper) < TRUSTED_STAGE || !helper?.helperUserId) return null;

  if (done) {
    return (
      <Text
        style={{
          fontSize: type.meta,
          fontWeight: '600',
          color: t.trustGold,
          lineHeight: 20,
          marginTop: spacing[3],
        }}
      >
        Review saved for {parent}, with your name on it.
      </Text>
    );
  }

  if (!open) {
    return (
      <ActionChip
        label={`Leave a review for ${parent}`}
        tonal
        onPress={() => setOpen(true)}
        style={{ marginTop: spacing[3] }}
      />
    );
  }

  return (
    <View
      style={{
        marginTop: spacing[3],
        padding: spacing[4],
        borderWidth: 1,
        borderColor: t.skyLine2,
        borderRadius: radius.card,
        gap: spacing[3],
      }}
    >
      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, lineHeight: 22 }}>
        {question}
      </Text>

      <StarPicker question={question} value={rating} onChange={setRating} />

      <Input
        label="A few words (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        placeholder={`What ${firstName} has been like for ${parent}`}
      />

      {errMsg ? (
        // Wrapped as one alert node so a failed save is spoken, not only drawn.
        <View accessible accessibilityRole="alert">
          <Text style={{ fontSize: type.meta, fontWeight: '500', color: t.redDeep, lineHeight: 20 }}>
            {errMsg}
          </Text>
        </View>
      ) : null}

      <Text style={{ fontSize: type.meta, color: t.trustGold, lineHeight: 20 }}>
        This is saved as {parent}&apos;s review, with your name on it as the person who wrote it.
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <Button
          title={save.isPending ? 'Saving…' : `Save for ${parent}`}
          variant="secondary"
          onPress={() => save.mutate()}
          disabled={save.isPending}
          style={{ flex: 1 }}
        />
        <ActionChip
          label="Never mind"
          onPress={() => {
            setOpen(false);
            setErrMsg('');
          }}
          style={{ flex: 1, minHeight: 44 }}
        />
      </View>
    </View>
  );
}
