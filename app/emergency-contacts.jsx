// Emergency contacts — port of EmergencyContacts.jsx: list, add, remove
// (create/read/delete only — no edit endpoint exists). SOS lives on Home.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import api from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';

export default function EmergencyContacts() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: async () => (await api.get('/emergency/contacts')).data,
  });

  const [form, setForm] = useState({ name: '', phone: '', relationship: '' });
  const [formError, setFormError] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });

  const add = useMutation({
    mutationFn: (body) => api.post('/emergency/contacts', body),
    onSuccess: () => {
      setForm({ name: '', phone: '', relationship: '' });
      showToast('Contact added.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not add the contact. Please try again.', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/emergency/contacts/${id}`),
    onSuccess: () => {
      showToast('Contact removed.', 'info');
      refresh();
    },
    onError: () => showToast('Could not remove the contact. Please try again.', 'error'),
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

  const confirmRemove = (contact) =>
    Alert.alert('Remove this contact?', `${contact.name} will no longer receive your SOS alerts.`, [
      { text: 'Keep them', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(contact.id) },
    ]);

  return (
    <Screen back title="Emergency contacts" keyboard>
      <Card>
        <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          These people get an alert the moment you press the SOS button on your Home feed.
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
          <Text style={{ marginTop: spacing[3], fontSize: text.base, color: t.inkSlate }}>Loading…</Text>
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
                onPress={() => confirmRemove(c)}
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
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Phone number"
          value={form.phone}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
          keyboardType="phone-pad"
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Who they are to you"
          value={form.relationship}
          onChangeText={(v) => setForm((f) => ({ ...f, relationship: v }))}
          helper='Like "daughter", "neighbor", or "family friend".'
          style={{ marginBottom: spacing[5] }}
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
