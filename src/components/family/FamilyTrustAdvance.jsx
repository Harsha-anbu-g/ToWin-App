// Guardian mode (ADVANCE_TRUST, FAM-509): the family member takes the
// parent's next step on the trust ladder for them.
//
// The parent keeps their own seat — the step is recorded as theirs, so the
// friendship still belongs to them. What changes is only who tapped, and the
// helper is told that plainly. The server re-checks the parent's grant before
// it accepts the step.
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { TRUSTED_STAGE, stageIndexOf } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';

export default function FamilyTrustAdvance({ helper, elderName, onChanged }) {
  const { t, spacing, type } = useTheme();
  const { showToast } = useToast();

  const parent = elderName || 'your parent';
  const firstName = (helper?.helperName || 'them').split(' ')[0];
  // Inline confirm (rulebook): advancing someone ELSE's ladder in their name
  // is irreversible — one silent tap must never do it.
  const [confirming, setConfirming] = useState(false);

  const advance = useMutation({
    // No elder id in the body on purpose: the connection already names both
    // seats, so the server works out whose seat this caller may take.
    mutationFn: () => api.post(`/trust/${helper.connectionId}/confirm`),
    onSuccess: () => {
      showToast(`Step taken for ${parent}. ${firstName} will see you moved it.`, 'success');
      onChanged?.();
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not move that step. Please try again.',
        'error'
      ),
  });

  // At the top of the ladder there is no next step to take.
  if (!helper?.connectionId || stageIndexOf(helper) >= TRUSTED_STAGE) return null;

  return (
    <View style={{ marginTop: spacing[3] }}>
      {confirming ? (
        <View style={{ gap: spacing[2] }}>
          <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 22 }}>
            Take {parent}&apos;s next step with {firstName}? The step counts as theirs.
          </Text>
          <Button
            title={advance.isPending ? 'Moving…' : `Yes, move it for ${parent}`}
            variant="secondary"
            onPress={() => advance.mutate()}
            disabled={advance.isPending}
          />
          <Button title="Not now" variant="text" onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <Button
          title={`Move the next step forward for ${parent}`}
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      )}
      <Text
        style={{
          fontSize: type.meta,
          color: t.trustGold,
          lineHeight: 20,
          marginTop: spacing[2],
        }}
      >
        The step counts as {parent}&apos;s. {firstName} sees that you took it for them.
      </Text>
    </View>
  );
}
