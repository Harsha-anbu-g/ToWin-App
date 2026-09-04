// The family request form (FAM-402, side-aware since FAM-403) — collapsed
// behind the screen's one filled primary. Copy is 1:1 with the web pages;
// `side` names the seat the IDENTIFIED person takes (the backend contract's
// seat rule — never flip it): 'elder' = a FAMILY user adding their parent
// (FamilyHome), 'family' = an elder adding a family member (MyFamily).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { sendFamilyRequest } from '../../api/family';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

// Exact web copy per side — FamilyHome.jsx vs MyFamily.jsx. The only
// differences the web has: title, consent helper, relationship label, toast.
const COPY = {
  elder: {
    title: 'Add your parent',
    helper:
      'Type their exact Towinly username, email or phone. They must say yes before you see anything.',
    relationshipLabel: 'Relationship (what you are to them)',
    successToast: 'Request sent. You become family here once they accept.',
  },
  family: {
    title: 'Add a family member',
    helper:
      'Type their exact Towinly username, email or phone. They must say yes before anything is shared.',
    relationshipLabel: 'Relationship',
    successToast: 'Request sent. It becomes a family link when they accept.',
  },
};

export default function AddParentForm({ onClose, side = 'elder' }) {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [relationship, setRelationship] = useState('');
  const [formError, setFormError] = useState('');
  // Return-key path (UX-708): Next lands in the relationship field.
  const relationshipRef = useRef(null);

  const copy = COPY[side];

  const send = useMutation({
    mutationFn: () =>
      sendFamilyRequest({
        identifier: identifier.trim(),
        relationship: relationship.trim(),
        side,
      }),
    onSuccess: () => {
      showToast(copy.successToast, 'success');
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
        {copy.title}
      </Text>
      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[2] }}>
        {copy.helper}
      </Text>

      {/* Autofill is told to stand down: this identifies the OTHER person,
          and iOS/Android would otherwise offer the user's own handle. */}
      <Input
        label="Username, email or phone"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Exactly as they use it on Towinly"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="none"
        autoComplete="off"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => relationshipRef.current?.focus()}
        style={{ marginTop: spacing[4] }}
      />
      <Input
        ref={relationshipRef}
        label={copy.relationshipLabel}
        value={relationship}
        onChangeText={setRelationship}
        placeholder="Daughter, Son, Niece…"
        autoCapitalize="words"
        returnKeyType="done"
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
            open — the "+ Add …" pill that opened it is hidden either side. */}
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
