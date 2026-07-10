// Edit my profile — port of ProfileEdit.jsx essentials: name, bio, interests/
// skills, languages, phone, and city via the backend's geocode search. Fields
// arrive prefilled (recognition over recall, HCI rule 6).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';

const toList = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function ProfileEdit() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const isHelper = user?.role === 'HELPER';

  const { data: me } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });

  const [form, setForm] = useState({ name: '', bio: '', tags: '', languages: '', phone: '', city: '' });
  const [loadedFrom, setLoadedFrom] = useState(null);

  // Prefill once when the profile arrives (don't clobber in-progress edits)
  useEffect(() => {
    if (me && loadedFrom !== me) {
      setForm({
        name: me.name ?? '',
        bio: me.bio ?? '',
        tags: (isHelper ? me.skillsOffered : me.interests)?.join(', ') ?? '',
        languages: me.languages?.join(', ') ?? '',
        phone: me.phone ?? '',
        city: me.city ?? '',
      });
      setLoadedFrom(me);
    }
  }, [me, isHelper, loadedFrom]);

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        languages: toList(form.languages),
      };
      if (isHelper) {
        await api.put('/profile/helper', { ...base, skillsOffered: toList(form.tags) });
      } else {
        await api.put('/profile/elder', { ...base, interests: toList(form.tags) });
      }
      if (form.phone.trim() && form.phone.trim() !== (me?.phone ?? '')) {
        await api.put('/profile/phone', { phone: form.phone.trim() });
      }
      if (form.city.trim() && form.city.trim() !== (me?.city ?? '')) {
        // Web flow: geocode the typed place, then save coordinates + city
        const { data } = await api.get(`/geocode/search?q=${encodeURIComponent(form.city.trim())}`);
        await api.put('/profile/location', {
          locationLat: data.lat,
          locationLng: data.lng,
          city: data.city ?? form.city.trim(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      showToast('Profile saved.', 'success');
      router.back();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not save right now. Please try again.', 'error'),
  });

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <Screen back title="Edit my profile" keyboard>
      <Card>
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[4] }}>
          About me
        </Text>
        <Input label="Name" value={form.name} onChangeText={set('name')} style={{ marginBottom: spacing[4] }} />
        <Input
          label="A few words about me"
          value={form.bio}
          onChangeText={set('bio')}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          helper="What you enjoy, what you're looking for — plain words are perfect."
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label={isHelper ? 'What I can help with' : 'My interests'}
          value={form.tags}
          onChangeText={set('tags')}
          helper='Separate with commas, like "gardening, chess, cooking".'
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Languages I speak"
          value={form.languages}
          onChangeText={set('languages')}
          helper="Separate with commas."
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Phone number"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          helper="Only shared after both people reach the Phone Ready trust stage."
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="My town or city"
          value={form.city}
          onChangeText={set('city')}
          helper="Used only to match you with people nearby."
          style={{ marginBottom: spacing[5] }}
        />
        <Button
          title={save.isPending ? 'Saving…' : 'Save changes'}
          variant="primary"
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
      </Card>

      <View style={{ marginTop: spacing[4] }}>
        <Text style={{ fontSize: text.sm, color: t.ink4, textAlign: 'center', lineHeight: 20 }}>
          Adding a photo arrives in a later update.
        </Text>
      </View>
    </Screen>
  );
}
