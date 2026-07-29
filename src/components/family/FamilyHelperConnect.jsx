// Trust inheritance (FAM-507): the parent's earned trust is the bridge. When
// the elder's friendship is shared and has reached Messaging, the family
// member holds the same standing — they can message the helper directly, no
// request, no accept. The family member stays in control on their side:
// pause or remove it. Ported from web FamilyHelperConnect.jsx.
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { isInheritable } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';

export default function FamilyHelperConnect({
  helper,
  standing,
  standingsLoaded = true,
  elderName,
  onChanged,
}) {
  const { t, spacing, type } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  const firstName = (helper.helperName || '').split(' ')[0];
  const parent = elderName || 'your parent';

  const call = useMutation({
    mutationFn: ({ path }) => api.post(path),
    onSuccess: (_r, { okMessage, undo }) => {
      if (okMessage) showToast(okMessage, 'success', undo ? { actionLabel: 'Undo', onAction: undo } : {});
      onChanged?.();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'That didn’t work. Please try again.', 'error'),
  });

  const openChat = useMutation({
    mutationFn: () => api.post(`/family/standings/${standing.standingConnectionId}/chat`),
    onSuccess: (r) => router.push(`/chat/${r.data}`),
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not open the chat. Please try again.', 'error'),
  });

  const busy = call.isPending || openChat.isPending;

  // Below Messaging there is nothing to inherit yet — say what unlocks it.
  if (!isInheritable(helper)) {
    return (
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[3] }}>
        Family chat opens when {parent} and {firstName} reach Messaging — they&apos;re still at the
        first step.
      </Text>
    );
  }

  // Standings haven't finished loading (or the fetch failed) — say nothing
  // rather than falsely claim the person removed a connection they never touched.
  if (!standing && !standingsLoaded) return null;

  // Shared and high enough, but no standing: the family member removed it.
  if (!standing) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[2],
          marginTop: spacing[3],
        }}
      >
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20 }}>
          You removed this connection.
        </Text>
        <ActionChip
          label="Bring it back"
          tonal
          disabled={busy}
          onPress={() =>
            call.mutate({
              path: `/family/standings/${helper.connectionId}/resume`,
              okMessage: 'Connection restored.',
            })
          }
        />
      </View>
    );
  }

  if (standing.paused) {
    return (
      <View style={{ marginTop: spacing[3] }}>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20 }}>
          You paused this chat — neither of you can send messages until you resume it.
        </Text>
        <ActionChip
          label="Resume"
          tonal
          disabled={busy}
          onPress={() =>
            call.mutate({
              path: `/family/standings/${standing.standingConnectionId}/resume`,
              okMessage: 'Chat resumed.',
            })
          }
          style={{ marginTop: spacing[2], alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  const message = () => {
    // The chat may already exist — go straight there without a request.
    if (standing.chatConnectionId) {
      router.push(`/chat/${standing.chatConnectionId}`);
      return;
    }
    openChat.mutate();
  };

  // Removing is reversible — resume restores the same connection, so the way
  // back rides on the toast instead of a dialog in front of every tap.
  const remove = () =>
    call.mutate({
      path: `/family/standings/${standing.standingConnectionId}/revoke`,
      okMessage: 'Connection removed.',
      undo: () =>
        call.mutate({
          path: `/family/standings/${helper.connectionId}/resume`,
          okMessage: 'Connection restored.',
        }),
    });

  return (
    <View style={{ marginTop: spacing[3] }}>
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep, lineHeight: 20 }}>
        You hold {parent}&apos;s trust with {firstName} — you can message them directly.
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[3],
          marginTop: spacing[2],
        }}
      >
        <ActionChip
          label={openChat.isPending ? 'Opening…' : `Message ${firstName}`}
          tonal
          disabled={busy}
          onPress={message}
        />
        <ActionChip
          label="Pause"
          disabled={busy}
          onPress={() =>
            call.mutate({
              path: `/family/standings/${standing.standingConnectionId}/pause`,
              okMessage: 'Chat paused.',
            })
          }
        />
        <ActionChip label="Remove" destructive disabled={busy} onPress={remove} />
      </View>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[2] }}>
        {parent} always sees that you two can talk. If {parent} stops sharing this friendship, the
        chat closes.
      </Text>
    </View>
  );
}
