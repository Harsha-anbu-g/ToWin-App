// Emergency contacts — port of EmergencyContacts.jsx: list, add, remove
// (create/read/delete only — no edit endpoint exists). The SOS button is
// hidden app-wide for now (user call 2026-07-17); contacts remain manageable.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import api, { friendlyWriteError } from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Input from '../src/components/ui/Input';
import LoadError from '../src/components/ui/LoadError';
import Screen from '../src/components/ui/Screen';
import SkeletonCard from '../src/components/ui/Skeleton';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';
import { spacing } from '../src/theme/tokens';

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[4] };
const FIELD_GAP_LG = { marginBottom: spacing[5] };

export default function EmergencyContacts() {
  const { t, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // isError matters more here than anywhere: a dropped network must NEVER
  // tell someone they have no emergency contacts (rulebook: failed loads
  // never masquerade as empty).
  const { data: contacts, isLoading, isError, refetch } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: async () => (await api.get('/emergency/contacts')).data,
  });

  const [form, setForm] = useState({ name: '', phone: '', relationship: '' });
  const [formError, setFormError] = useState('');

  // Stable per-field handlers (the action.jsx pattern): Input is memo'd
  // (floating-label Paper fields), so a keystroke in one field must not
  // re-render its siblings.
  const fieldHandlers = useMemo(
    () =>
      Object.fromEntries(
        ['name', 'phone', 'relationship'].map((key) => [key, (v) => setForm((f) => ({ ...f, [key]: v }))])
      ),
    []
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });

  const add = useMutation({
    mutationFn: (body) => api.post('/emergency/contacts', body),
    onSuccess: () => {
      setForm({ name: '', phone: '', relationship: '' });
      showToast('Contact added.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(
        friendlyWriteError(err, err?.response?.data?.message || 'Could not add the contact. Please try again.'),
        'error'
      ),
  });

  // Undo over confirmation (rulebook): removing is reversible — we hold the
  // contact's own data, so the toast's Undo re-adds it in one tap.
  const remove = useMutation({
    mutationFn: (contact) => api.delete(`/emergency/contacts/${contact.id}`),
    onSuccess: (_r, contact) => {
      showToast(`${contact.name} removed.`, 'info', {
        actionLabel: 'Undo',
        onAction: () =>
          add.mutate({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship || 'Contact',
          }),
      });
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not remove the contact. Please try again.'), 'error'),
  });

  const submit = () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Please add their name.');
      return;
    }
    const digits = form.phone.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(digits)) {
      setFormError('Enter a valid phone number (10 to 15 digits).');
      return;
    }
    add.mutate({ name: form.name.trim(), phone: digits, relationship: form.relationship.trim() || 'Contact' });
  };

  return (
    <Screen back title="Emergency contacts" keyboard>

      <Card style={{ marginTop: spacing[4] }}>
        <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          These are the people to reach quickly if something ever happens.
        </Text>
      </Card>

      <Card style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          My contacts
        </Text>
        {isLoading ? (
          <SkeletonCard lines={2} />
        ) : isError ? (
          <LoadError what="your emergency contacts" onRetry={refetch} style={{ marginTop: spacing[3] }} />
        ) : (contacts ?? []).length === 0 ? (
          <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            Nobody yet. Add a family member or a trusted neighbor below.
          </Text>
        ) : (
          contacts.map((c, i) => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                paddingVertical: spacing[3],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.hairline,
              }}
            >
              <Avatar name={c.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: text.base, color: t.ink }}>{c.name}</Text>
                <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 1 }}>
                  {c.relationship ? `${c.relationship} · ` : ''}
                  {c.phone}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${c.name}`}
                onPress={() => remove.mutate(c)}
                hitSlop={8}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={20} color={t.redDeep} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[4] }}
        >
          Add a contact
        </Text>
        {formError ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: t.redTint,
              borderWidth: 1,
              borderColor: t.redLine,
              borderRadius: 11,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: text.sm, color: t.redError }}>{formError}</Text>
          </View>
        ) : null}
        <Input
          label="Name"
          value={form.name}
          onChangeText={fieldHandlers.name}
          style={FIELD_GAP}
        />
        <Input
          label="Phone number"
          value={form.phone}
          onChangeText={fieldHandlers.phone}
          keyboardType="phone-pad"
          style={FIELD_GAP}
        />
        <Input
          label="Who they are to you"
          value={form.relationship}
          onChangeText={fieldHandlers.relationship}
          helper='Like "daughter", "neighbor", or "family friend".'
          style={FIELD_GAP_LG}
        />
        <Button
          title={add.isPending ? 'Adding…' : 'Add contact'}
          variant="primary"
          onPress={submit}
          loading={add.isPending}
        />
      </Card>
    </Screen>
  );
}
