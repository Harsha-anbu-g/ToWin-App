// Emergency SOS — prominent but calm (red is semantic only, never themed).
// Confirms before sending (HCI rule 5); POST /emergency/sos texts the emergency
// contacts and alerts family (mirrors EmergencyContacts.jsx / NavBar). The
// answer says who was reached, and the toast repeats exactly that.
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { sendSos } from '../../api/emergency';
import { SOS_NOTICE_MS, sosFailedMessage, sosSentMessage } from '../../lib/sosOutcome';
import Button from '../ui/Button';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../i18n';

export default function SosCard() {
  const { t, spacing, radius, text } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const sos = useMutation({
    mutationFn: sendSos,
    onSuccess: (outcome) => {
      const sent = sosSentMessage(outcome);
      showToast(sent.text, sent.ok ? 'success' : 'error', { duration: SOS_NOTICE_MS });
    },
    onError: (err) => showToast(sosFailedMessage(err), 'error', { duration: SOS_NOTICE_MS }),
  });

  const confirmSos = async () => {
    const ok = await confirm({
      title: tr('Send SOS?'),
      message: tr('This immediately alerts all of your emergency contacts that you need help.'),
      confirmLabel: tr('Send SOS'),
      destructive: true,
    });
    if (ok) sos.mutate();
  };

  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1.5,
        borderColor: t.redLine,
        borderRadius: radius.xl,
        padding: spacing[5],
      }}
    >
      <Text style={{ fontSize: text.base, fontWeight: '600', color: t.redDeep }}>{tr('Emergency')}</Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 21, marginTop: 4 }}>
        {tr('Sends an alert to your emergency contacts right away.')}
      </Text>
      <Button
        title={sos.isPending ? tr('Sending…') : tr('Send SOS')}
        variant="destructive"
        onPress={confirmSos}
        loading={sos.isPending}
        style={{ marginTop: spacing[4] }}
      />
    </View>
  );
}
