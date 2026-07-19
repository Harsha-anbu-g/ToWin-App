// Add your parent (FAM-402) — the FAMILY user's request form, collapsed
// behind Home's one filled primary. Copy is 1:1 with web FamilyHome.jsx;
// side:'elder' means "the person I'm identifying takes the elder seat"
// (the backend contract's seat rule — never flip it).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function AddParentForm({ onClose }) {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [relationship, setRelationship] = useState('');
  const [formError, setFormError] = useState('');

  const send = useMutation({
    mutationFn: () =>
      api.post('/family/requests', {
        identifier: identifier.trim(),
        relationship: relationship.trim(),
        side: 'elder',
      }),
    onSuccess: () => {
      showToast('Request sent. You become family here once they accept.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
      onClose();
    },
    // The backend's messages are already elder-friendly safe strings — surface
    // them first, fall back to the web's generic line.
    onError: (err) =>
      setFormError(err?.response?.data?.message || 'Could not send the request. Please try again.'),
  });

  const submit = () => {
    // The web relies on the browser's `required`; mobile gates here with the
    // backend's own blank-identifier message so no invented copy appears.
    if (!identifier.trim()) {
      setFormError('Please enter a username, email, or phone number');
      return;
    }
    setFormError('');
    send.mutate();
  };

  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        padding: spacing[4],
        marginTop: spacing[4],
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        Add your parent
      </Text>
      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[2] }}>
        Type their exact ToWin username, email or phone. They must say yes before you see anything.
      </Text>

      <Input
        label="Username, email or phone"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Exactly as they use it on ToWin"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ marginTop: spacing[4] }}
      />
      <Input
        label="Relationship (what you are to them)"
        value={relationship}
        onChangeText={setRelationship}
        placeholder="Daughter, Son, Niece…"
        style={{ marginTop: spacing[4] }}
      />

      {formError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: t.redError, fontSize: type.body, lineHeight: 22, marginTop: spacing[3] }}
        >
          {formError}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }}>
        {/* "Send request" is the screen's one filled primary while the form is
            open — the "+ Add your parent" pill that opened it is hidden. */}
        <Button
          title={send.isPending ? 'Sending…' : 'Send request'}
          onPress={submit}
          loading={send.isPending}
          style={{ flex: 1 }}
        />
        <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
