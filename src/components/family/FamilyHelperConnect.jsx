// Trust inheritance (FAM-507): the parent's earned trust is the bridge. When
// the elder's friendship is shared and has reached Messaging, the family
// member holds the same standing — they can message the helper directly, no
// request, no accept. The family member stays in control on their side:
// pause or remove it. Ported from web FamilyHelperConnect.jsx.
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import {
  openFamilyStandingChat,
  pauseFamilyStanding,
  resumeFamilyStanding,
  revokeFamilyStanding,
} from '../../api/family';
import { useToast } from '../../context/ToastContext';
import { isInheritable } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import { tr } from '../../i18n';

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
  const parent = elderName || tr('your parent');

  // Which named api function each standing action runs; the mutation's
  // variables still carry the toast words and the undo, exactly as before.
  const STANDING_ACTIONS = {
    pause: pauseFamilyStanding,
    resume: resumeFamilyStanding,
    revoke: revokeFamilyStanding,
  };

  const call = useMutation({
    mutationFn: ({ act, connectionId }) => STANDING_ACTIONS[act](connectionId),
    onSuccess: (_r, { okMessage, undo }) => {
      if (okMessage) showToast(okMessage, 'success', undo ? { actionLabel: tr('Undo'), onAction: undo } : {});
      onChanged?.();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || tr('That didn’t work. Please try again.'), 'error'),
  });

  const openChat = useMutation({
    mutationFn: () => openFamilyStandingChat(standing.standingConnectionId),
    onSuccess: (chatId) => router.push(`/chat/${chatId}`),
    onError: (err) =>
      showToast(err?.response?.data?.message || tr('Could not open the chat. Please try again.'), 'error'),
  });

  const busy = call.isPending || openChat.isPending;

  // Below Messaging there is nothing to inherit yet — say what unlocks it.
  if (!isInheritable(helper)) {
    return (
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[3] }}>
        {tr("Family chat opens when {parent} and {firstName} reach Messaging. They're still at the first step.", { parent, firstName })}
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
          {tr('You removed this connection.')}
        </Text>
        <ActionChip
          label={tr('Bring it back')}
          tonal
          disabled={busy}
          onPress={() =>
            call.mutate({
              act: 'resume',
              connectionId: helper.connectionId,
              okMessage: tr('Connection restored.'),
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
          {tr('You paused this chat. Neither of you can send messages until you resume it.')}
        </Text>
        <ActionChip
          label={tr('Resume')}
          tonal
          disabled={busy}
          onPress={() =>
            call.mutate({
              act: 'resume',
              connectionId: standing.standingConnectionId,
              okMessage: tr('Chat resumed.'),
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
      act: 'revoke',
      connectionId: standing.standingConnectionId,
      okMessage: tr('Connection removed.'),
      undo: () =>
        call.mutate({
          act: 'resume',
          connectionId: helper.connectionId,
          okMessage: tr('Connection restored.'),
        }),
    });

  return (
    <View style={{ marginTop: spacing[3] }}>
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep, lineHeight: 20 }}>
        {tr("You hold {parent}'s trust with {firstName}. You can message them directly.", { parent, firstName })}
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
          label={openChat.isPending ? tr('Opening…') : tr('Message {firstName}', { firstName })}
          tonal
          disabled={busy}
          onPress={message}
        />
        <ActionChip
          label={tr('Pause')}
          disabled={busy}
          onPress={() =>
            call.mutate({
              act: 'pause',
              connectionId: standing.standingConnectionId,
              okMessage: tr('Chat paused.'),
            })
          }
        />
        <ActionChip label={tr('Remove')} destructive disabled={busy} onPress={remove} />
      </View>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[2] }}>
        {tr('{parent} always sees that you two can talk. If {parent} stops sharing this friendship, the chat closes.', { parent })}
      </Text>
    </View>
  );
}
