// Edit Profile — full parity with the website's ProfileEdit: photo, name,
// date of birth (age computes from it), bio, interests / looking-for (elder)
// or skills / hobbies (helper), languages, occupation, sex, social links,
// phone, city (geocoded like the web), and ID verification. Prefilled
// (recognition over recall); pinned Save Changes + Cancel (3i).
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
import ChipsField from '../src/components/ui/ChipsField';
import Chip from '../src/components/ui/Chip';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { parseFlexibleDate } from '../src/lib/flexibleDate';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { yearsOld } from '../src/lib/copy';
import { useTheme } from '../src/theme/ThemeContext';
import { spacing } from '../src/theme/tokens';

const toList = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const GENDERS = ['Male', 'Female', 'Other'];

const EMPTY_FORM = {
  name: '',
  bio: '',
  tags: '', // interests (elder) / skillsOffered (helper)
  extraTags: '', // lookingFor (elder) / hobbies (helper)
  languages: '',
  phone: '',
  city: '',
  dateOfBirth: '',
  occupation: '',
  gender: '',
  facebookUrl: '',
  instagramUrl: '',
};

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[4] };
const BIO_INPUT_STYLE = { minHeight: 100, textAlignVertical: 'top' };

function SectionTitle({ children }) {
  const { t, fontFamily } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink, marginBottom: 12, marginTop: 8 }}
    >
      {children}
    </Text>
  );
}

export default function ProfileEdit() {
  const { t, type } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const isHelper = user?.role === 'HELPER';
  // Elder seat (ELDER or BOTH) — the only roles with a family circle to manage
  // (web ElderOnly guard on /family; FAM-403).
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const { data: me } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [dobError, setDobError] = useState('');
  // Snapshot of the loaded form — Cancel compares against it so a filled
  // form is never silently discarded (rulebook: confirm real data loss).
  const initialFormRef = useRef(EMPTY_FORM);
  const [prefilled, setPrefilled] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  // Prefill exactly ONCE. An object-identity guard is not enough here: photo
  // and ID uploads invalidate ['profile-me'] and the refetched object is
  // always a new reference (presigned photoUrl differs per fetch), which
  // would re-run the prefill and wipe typed-but-unsaved fields.
  useEffect(() => {
    if (me && !prefilled) {
      setForm({
        name: me.name ?? '',
        bio: me.bio ?? '',
        tags: (isHelper ? me.skillsOffered : me.interests)?.join(', ') ?? '',
        extraTags: (isHelper ? me.hobbies : me.lookingFor)?.join(', ') ?? '',
        languages: me.languages?.join(', ') ?? '',
        phone: me.phone ?? '',
        city: me.city ?? '',
        dateOfBirth: me.dateOfBirth ?? '',
        occupation: me.occupation ?? '',
        gender: me.gender ?? '',
        facebookUrl: me.facebookUrl ?? '',
        instagramUrl: me.instagramUrl ?? '',
      });
      initialFormRef.current = {
        name: me.name ?? '',
        bio: me.bio ?? '',
        tags: (isHelper ? me.skillsOffered : me.interests)?.join(', ') ?? '',
        extraTags: (isHelper ? me.hobbies : me.lookingFor)?.join(', ') ?? '',
        languages: me.languages?.join(', ') ?? '',
        phone: me.phone ?? '',
        city: me.city ?? '',
        dateOfBirth: me.dateOfBirth ?? '',
        occupation: me.occupation ?? '',
        gender: me.gender ?? '',
        facebookUrl: me.facebookUrl ?? '',
        instagramUrl: me.instagramUrl ?? '',
      };
      setPrefilled(true);
    }
  }, [me, isHelper, prefilled]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast('Towinly needs photo access — you can allow it in Settings.', 'error');
      return null;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets?.length) return null;
    return picked.assets[0];
  };

  const asFile = (asset) => ({
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  });

  // Same shape the website sends: PUT /profile/photo multipart `file`.
  const changePhoto = async () => {
    const asset = await pickImage();
    if (!asset) return;
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('file', asFile(asset));
      await api.put('/profile/photo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      showToast('Photo updated.', 'success');
    } catch (err) {
      showToast(friendlyWriteError(err, 'Could not upload the photo. Please try again.'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Website parity: POST /auth/verify-id multipart `file` (+3 trust when approved)
  const uploadId = async () => {
    const asset = await pickImage();
    if (!asset) return;
    setUploadingId(true);
    try {
      const fd = new FormData();
      fd.append('file', asFile(asset));
      await api.post('/auth/verify-id', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      showToast('ID uploaded. Verification is pending review.', 'success');
    } catch (err) {
      showToast(friendlyWriteError(err, 'Could not upload the ID. Please try again.'), 'error');
    } finally {
      setUploadingId(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      // Forgiving DOB (rulebook §16 / Postel): any unambiguous format is
      // accepted and normalized; ambiguity is refused with a plain error.
      const parsedDob = parseFlexibleDate(form.dateOfBirth);
      if (parsedDob?.error) {
        setDobError(parsedDob.error);
        throw Object.assign(new Error(parsedDob.error), { isDobError: true });
      }
      const dob = parsedDob?.value ?? null;
      // Age computes from date of birth when given (web computeAge parity)
      const computedAge = dob ? yearsOld(dob) : me?.age;
      const base = {
        name: form.name.trim(),
        age: computedAge,
        bio: form.bio.trim(),
        languages: toList(form.languages),
        occupation: form.occupation.trim() || null,
        gender: form.gender || null,
        facebookUrl: form.facebookUrl.trim() || null,
        instagramUrl: form.instagramUrl.trim() || null,
        dateOfBirth: dob,
      };
      if (isHelper) {
        await api.put('/profile/helper', {
          ...base,
          skillsOffered: toList(form.tags),
          hobbies: toList(form.extraTags),
        });
      } else {
        await api.put('/profile/elder', {
          ...base,
          interests: toList(form.tags),
          lookingFor: toList(form.extraTags),
        });
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
    onError: (err) => {
      // A DOB parse error is already shown inline next to its field.
      if (err?.isDobError) return;
      showToast(friendlyWriteError(err, 'Could not save right now. Please try again.'), 'error');
    },
  });

  // Stable per-field handlers (the action.jsx pattern): Input and Chip are
  // memo'd, so a keystroke in one field must not hand every sibling Paper
  // input fresh props (each animates a floating label — the source of typing
  // lag on slow phones).
  const fieldHandlers = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(EMPTY_FORM).map((key) => [key, (v) => setForm((f) => ({ ...f, [key]: v }))])
      ),
    []
  );
  const set = (key) => fieldHandlers[key];
  const genderHandlers = useMemo(
    () =>
      Object.fromEntries(
        GENDERS.map((g) => [g, () => setForm((f) => ({ ...f, gender: f.gender === g ? '' : g }))])
      ),
    []
  );

  return (
    <Screen back title="Edit Profile" scroll={false} keyboard contentStyle={{ padding: 0 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
      >
        {/* 3i: 72px avatar + hairline Change photo */}
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.blueDeep }}>
              {uploadingPhoto ? 'Uploading…' : 'Change photo'}
            </Text>
          </Pressable>
        </View>

        <SectionTitle>About you</SectionTitle>
        <Input label="Full name" value={form.name} onChangeText={set('name')} style={FIELD_GAP} />
        <Input
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={(v) => {
            set('dateOfBirth')(v);
            if (dobError) setDobError('');
          }}
          error={dobError}
          helper="Any way you like — 1953-05-14 or 14 May 1953. Only your age shows to others."
          autoCapitalize="none"
          style={FIELD_GAP}
        />
        <Input
          label="About you"
          value={form.bio}
          onChangeText={set('bio')}
          multiline
          numberOfLines={4}
          inputStyle={BIO_INPUT_STYLE}
          helper="Shown to helpers before you connect."
          style={FIELD_GAP}
        />
        <Input
          label="Occupation"
          value={form.occupation}
          onChangeText={set('occupation')}
          helper={isHelper ? 'What you do or study.' : 'What you did or still do.'}
          style={FIELD_GAP}
        />
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 8 }}>
          Sex (optional)
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
          {GENDERS.map((g) => (
            <Chip
              key={g}
              label={g}
              selected={form.gender === g}
              onPress={genderHandlers[g]}
            />
          ))}
        </View>

        <SectionTitle>{isHelper ? 'How you help' : 'What you enjoy'}</SectionTitle>
        {/* Chips, not comma bookkeeping (deferred rulebook item): each entry
            is a removable pill; return or a typed comma adds the next one. */}
        <ChipsField
          label={isHelper ? 'What I can help with' : 'My interests'}
          value={form.tags}
          onChangeText={set('tags')}
          helper='Type one, like "gardening", then press return. Tap a pill to remove it.'
          style={FIELD_GAP}
        />
        <ChipsField
          label={isHelper ? 'My hobbies' : "What I'm looking for"}
          value={form.extraTags}
          onChangeText={set('extraTags')}
          helper={
            isHelper
              ? 'Things you love doing — one at a time, press return after each.'
              : 'Like "company" or "a walking friend" — press return after each.'
          }
          style={FIELD_GAP}
        />
        <ChipsField
          label="Languages I speak"
          value={form.languages}
          onChangeText={set('languages')}
          helper="One language at a time, press return after each."
          style={FIELD_GAP}
        />

        <SectionTitle>How to reach you</SectionTitle>
        <Input
          label="My town or city"
          value={form.city}
          onChangeText={set('city')}
          helper="Used only to match you with people nearby."
          style={FIELD_GAP}
        />
        <Input
          label="Phone number"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          helper="Only shared after both people reach the Phone Ready trust stage."
          style={FIELD_GAP}
        />
        <Input
          label="Facebook link (optional)"
          value={form.facebookUrl}
          onChangeText={set('facebookUrl')}
          autoCapitalize="none"
          keyboardType="url"
          style={FIELD_GAP}
        />
        <Input
          label="Instagram link (optional)"
          value={form.instagramUrl}
          onChangeText={set('instagramUrl')}
          autoCapitalize="none"
          keyboardType="url"
          style={FIELD_GAP}
        />

        <SectionTitle>ID verification</SectionTitle>
        <View
          style={{
            backgroundColor: t.canvas,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 14,
            marginBottom: spacing[2],
          }}
        >
          <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 21 }}>
            {me?.idVerified
              ? 'Your ID is verified — it earns profile trust points.'
              : 'A one-time ID check earns profile trust points. A person reviews it; your ID is never shown to others.'}
          </Text>
          {!me?.idVerified ? (
            <Button
              title={uploadingId ? 'Uploading…' : 'Upload an ID photo'}
              variant="secondary"
              onPress={uploadId}
              loading={uploadingId}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </View>

        {/* My Family (FAM-403, elders only) — web ProfileEdit card, exact copy.
            Managing happens on /family; this card only explains and links. */}
        {isElder ? (
          <>
            <SectionTitle>My Family</SectionTitle>
            <View
              style={{
                backgroundColor: t.canvas,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 16,
                padding: 14,
                marginBottom: spacing[2],
              }}
            >
              <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 21 }}>
                Link your family so they can see you're safe. They only see the friendships you
                choose to share, and you can remove anyone at any time.
              </Text>
              <Button
                title="Manage My Family"
                variant="secondary"
                onPress={() => router.push('/family')}
                style={{ marginTop: 12 }}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Pinned Save Changes + Cancel (3i) */}
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3], gap: spacing[2] }}>
        <Button
          title={save.isPending ? 'Saving…' : 'Save Changes'}
          variant="primary"
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => {
            // A filled form must never vanish on one silent tap (rulebook:
            // confirm genuinely irreversible data loss).
            const dirty =
              initialFormRef.current &&
              JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
            if (!dirty) return router.back();
            Alert.alert('Discard your changes?', 'Nothing you typed here will be saved.', [
              { text: 'Keep editing', style: 'cancel' },
              { text: 'Discard changes', style: 'destructive', onPress: () => router.back() },
            ]);
          }}
        />
      </View>
    </Screen>
  );
}
