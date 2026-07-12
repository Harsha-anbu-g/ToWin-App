// Edit my profile — port of ProfileEdit.jsx essentials: name, bio, interests/
// skills, languages, phone, and city via the backend's geocode search. Fields
// arrive prefilled (recognition over recall, HCI rule 6).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import api from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pick a square photo and PUT it as multipart `file` — exactly what the
  // website's uploadPhoto() sends; response carries the new photoUrl.
  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast('ToWin needs photo access — you can allow it in Settings.', 'error');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      await api.put('/profile/photo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      showToast('Photo updated.', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not upload the photo. Please try again.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Screen back title="Edit Profile" scroll={false} keyboard contentStyle={{ padding: 0 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
      >
        {/* 3i: 72px avatar + tonal Change photo (PUT /profile/photo, web parity) */}
        <View style={{ alignItems: 'center', marginTop: spacing[2], marginBottom: spacing[5] }}>
          <Avatar name={me?.name} uri={me?.photoUrl} size={72} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change photo"
            accessibilityState={{ busy: uploadingPhoto }}
            onPress={changePhoto}
            disabled={uploadingPhoto}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({
              height: 34,
              paddingHorizontal: 16,
              borderRadius: 17,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: t.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing[3],
              opacity: pressed || uploadingPhoto ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.blueDeep }}>
              {uploadingPhoto ? 'Uploading…' : 'Change photo'}
            </Text>
          </Pressable>
        </View>

        <Input label="Name" value={form.name} onChangeText={set('name')} style={{ marginBottom: spacing[4] }} />
        <Input
          label="My town or city"
          value={form.city}
          onChangeText={set('city')}
          helper="Used only to match you with people nearby."
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
          label="About you"
          value={form.bio}
          onChangeText={set('bio')}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          helper="Shown to helpers before you connect."
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
        />
      </ScrollView>

      {/* Pinned Save Changes + hairline Cancel (3i) */}
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3], gap: spacing[2] }}>
        <Button
          title={save.isPending ? 'Saving…' : 'Save Changes'}
          variant="primary"
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
