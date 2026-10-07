// Emergency SOS — prominent but calm (red is semantic only, never themed).
// Confirms before sending (HCI rule 5); POST /emergency/sos alerts all
// emergency contacts (mirrors EmergencyContacts.jsx / NavBar).
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { sendSos } from '../../api/emergency';
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
    onSuccess: () => showToast(tr('SOS sent to all emergency contacts.'), 'success'),
    onError: () => showToast(tr('Failed to send SOS. Please call your contacts directly.'), 'error'),
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
