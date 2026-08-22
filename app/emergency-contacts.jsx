// Emergency contacts — port of EmergencyContacts.jsx: list, add, remove
// (create/read/delete only — no edit endpoint exists). The SOS button is
// hidden app-wide for now (user call 2026-07-17); contacts remain manageable.
//
// Each contact is one tap from a call (HARD-112). The card used to say "these
// are the people to reach quickly if something ever happens" above a list where
// the numbers were plain text and nothing on the screen could reach anybody:
// SOS is not mounted (app/(tabs)/home.jsx:160) and the only thing that reaches
// a contact by itself is the first-meet SMS the backend sends
// (TrustService.java:123 -> SosService.notifyFirstMeet). The sentence now
// names the tap and that message, and the row makes the tap real.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Phone, Trash2 } from '../src/components/icons';
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
  // Array.isArray, never `contacts ?? []`. A captive portal on hotel or cafe
  // wifi answers 200 with an HTML login page, so axios hands back a STRING.
  // `??` catches null and undefined only, that string has a length above zero,
  // and the old guard skipped the empty branch and called .map on it: a throw
  // mid-render. Elders on public wifi are exactly who this app serves. Same
  // shape as app/(tabs)/_layout.jsx:210.
  const contactList = Array.isArray(contacts) ? contacts : [];

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

  // Return-key path (UX-708): Next walks name → phone → who they are, Done
  // adds the contact. Stable callbacks (memo'd Inputs); the keyboard submit
  // reads fresh form state through a latest-ref.
  const phoneRef = useRef(null);
  const relationshipRef = useRef(null);
  const focusPhone = useCallback(() => phoneRef.current?.focus(), []);
  const focusRelationship = useCallback(() => relationshipRef.current?.focus(), []);
  const submitRef = useRef(null);
  const submitFromKeyboard = useCallback(() => submitRef.current?.(), []);

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
  // A dialer that refuses must not leave a dead tap: the person is trying to
  // reach somebody, so the failure speaks and hands the number back to dial by
  // hand (the CreatorCard ending, DEEP-30). react-native-web resolves openURL
  // either way, so this only ever runs on a device with no dialer.
  const dialerRefused = (contact) =>
    showToast(`Could not open the phone app. ${contact.name}'s number is ${contact.phone}.`, 'error');

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
  useEffect(() => {
    submitRef.current = () => {
      if (!add.isPending) submit();
    };
  });

  return (
    <Screen back title="Emergency contacts" keyboard onRefresh={refresh}>

      <Card style={{ marginTop: spacing[4] }}>
        <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          Tap a name to call them. Towinly also sends each of them a text message when you and a
          friend agree to meet in person for the first time.
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
        ) : contactList.length === 0 ? (
          <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            Nobody yet. Add a family member or a trusted neighbor below.
          </Text>
        ) : (
          contactList.map((c, i) => (
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
              {/* The name leads the label: a screen reader user choosing
                  between two contacts hears who it is before a run of digits.
                  blueDeep, not blue: 5.30:1 on the card by day and 7.30:1 at
                  night, where blue measures 2.81:1 and would fail the 3:1
                  non-text floor on the icon.
                  role="link" and the openURL inline, both on purpose: this row
                  hands the person to the dialer, which is not a screen this app
                  owns, and __tests__/link-role.test.js reads the element itself
                  to tell a hand-off from an in-app route change. */}
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Call ${c.name}${c.relationship ? `, ${c.relationship}` : ''}, ${c.phone}`}
                accessibilityHint="Opens your phone app"
                onPress={() => Linking.openURL(`tel:${c.phone}`).catch(() => dialerRefused(c))}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: text.base, color: t.ink }}>{c.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  <Phone size={14} color={t.blueDeep} strokeWidth={1.8} />
                  <Text style={{ fontSize: text.sm, color: t.blueDeep }}>
                    {c.relationship ? `${c.relationship} · ` : ''}
                    {c.phone}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${c.name}`}
                onPress={() => remove.mutate(c)}
                hitSlop={8}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
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
        {/* No autofill hints on purpose: this is ANOTHER person's name and
            number, and autofill would offer the elder their own. */}
        <Input
          label="Name"
          value={form.name}
          onChangeText={fieldHandlers.name}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusPhone}
          style={FIELD_GAP}
        />
        <Input
          ref={phoneRef}
          label="Phone number"
          value={form.phone}
          onChangeText={fieldHandlers.phone}
          keyboardType="phone-pad"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusRelationship}
          style={FIELD_GAP}
        />
        <Input
          ref={relationshipRef}
          label="Who they are to you"
          value={form.relationship}
          onChangeText={fieldHandlers.relationship}
          helper='Like "daughter", "neighbor", or "family friend".'
          returnKeyType="done"
          onSubmitEditing={submitFromKeyboard}
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
