// Edit Profile — full parity with the website's ProfileEdit: photo, name,
// date of birth (age computes from it), bio, interests / looking-for (elder)
// or skills / hobbies (helper), languages, occupation, sex, social links,
// phone, city (geocoded like the web), and ID verification. Prefilled
// (recognition over recall); pinned Save Changes + Cancel (3i).
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { friendlyWriteError } from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
import ChipsField from '../src/components/ui/ChipsField';
import Chip from '../src/components/ui/Chip';
import Input from '../src/components/ui/Input';
import LoadError from '../src/components/ui/LoadError';
import LocationPrimer from '../src/components/location/LocationPrimer';
import Screen from '../src/components/ui/Screen';
import SkeletonCard from '../src/components/ui/Skeleton';
import { useAuth } from '../src/context/AuthContext';
import { useConfirm } from '../src/context/ConfirmContext';
import { useToast } from '../src/context/ToastContext';
import { STATUS } from '../src/lib/deviceLocation';
import useDevicePosition from '../src/lib/useDevicePosition';
import { parseFlexibleDate } from '../src/lib/flexibleDate';
import { buildUpload } from '../src/lib/uploadFile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { objectionableError } from '../src/lib/contentFilter';
import { yearsOld } from '../src/lib/copy';
import { useTheme } from '../src/theme/ThemeContext';
import { spacing } from '../src/theme/tokens';

const toList = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const GENDERS = ['Male', 'Female', 'Other'];

// Elders answer this with ONE choice, never a typed list: the backend field is
// the LookingForType enum (FRIENDSHIP | HELP | BOTH) and /profile/me returns it
// as a bare string. Labels are the plain words an elder would use.
const LOOKING_FOR = [
  { value: 'FRIENDSHIP', label: 'Friendship' },
  { value: 'HELP', label: 'Help with things' },
  { value: 'BOTH', label: 'Both' },
];
const DEFAULT_LOOKING_FOR = 'BOTH';

const EMPTY_FORM = {
  name: '',
  bio: '',
  tags: '', // interests (elder) / skillsOffered (helper)
  extraTags: '', // hobbies (helper only)
  lookingFor: DEFAULT_LOOKING_FOR, // elder only, enum not list
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
  const { t, type, fontScaleCaps } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();

  const isHelper = user?.role === 'HELPER';
  // Elder seat (ELDER or BOTH) — the only roles with a family circle to manage
  // (web ElderOnly guard on /family; FAM-403).
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const { data: me, isError: meFailed, refetch: refetchMe } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [dobError, setDobError] = useState('');
  // Apple 1.2: a bio is read by every elder deciding whether to let this person in.
  const [bioError, setBioError] = useState('');
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
        extraTags: isHelper ? (me.hobbies?.join(', ') ?? '') : '',
        lookingFor: me.lookingFor ?? DEFAULT_LOOKING_FOR,
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
        extraTags: isHelper ? (me.hobbies?.join(', ') ?? '') : '',
        lookingFor: me.lookingFor ?? DEFAULT_LOOKING_FOR,
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

  // The phone's own position, offered beside the town box. Read-only on mount:
  // the iOS prompt is spent by a tap on the card and nowhere else.
  const {
    status: locStatus,
    busy: locBusy,
    hasPosition,
    enable: enableLocation,
    dismissed: locDismissed,
    dismiss: hideLocationCard,
  } = useDevicePosition();
  // `locStatus` stays null until the first read lands, so the card waits rather
  // than flashing the wrong words.
  const shouldAskForLocation = !!locStatus && !hasPosition && !locDismissed;

  // Saving the phone's position makes the backend reverse-geocode a town onto
  // the account (ProfileService.java:93-97). The box has to be told what that
  // town is, or the save handler below reads form.city !== me.city, forward-
  // geocodes the OLD typed text, and PUTs that town's single centre point over
  // the ~2 km cell this just saved. One press of Save would undo the thing the
  // person came here to do.
  const savePositionFromPhone = useCallback(async () => {
    const status = await enableLocation();
    // Refused, off, unsupported: the card says what happened and the typed town
    // carries on working exactly as it did.
    if (status !== STATUS.allowed) return;
    let town = '';
    try {
      const { data: fresh } = await refetchMe();
      town = fresh?.city ?? '';
    } catch {
      // A refetch that will not land is not worth a banner: the position IS
      // saved against the account. An empty box is the safe answer, because the
      // guard below needs a non-empty city before it geocodes anything, so a
      // dropped connection can never end with a town centre written over the
      // cell that was just saved.
    }
    setForm((f) => ({ ...f, city: town }));
    // Cancel compares against this snapshot. The town is already saved, so
    // offering to discard it would name a change nobody made.
    initialFormRef.current = { ...initialFormRef.current, city: town };
  }, [enableLocation, refetchMe]);

  // One picker at a time. A second tap while the sheet is opening is what an
  // elder does when nothing seems to happen, and Android answers it with
  // "Different ImagePicker is already in use" — a rejection that used to
  // escape the async onPress with no handler, so the tap died in silence.
  const pickingRef = useRef(false);
  const pickImage = async () => {
    if (pickingRef.current) return null;
    pickingRef.current = true;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Towinly needs photo access. You can allow it in Settings.', 'error');
        return null;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets?.length) return null;
      return picked.assets[0];
    } catch {
      showToast('Could not open your photos. Please try again.', 'error');
      return null;
    } finally {
      pickingRef.current = false;
    }
  };

  // Same shape the website sends: PUT /profile/photo multipart `file`.
  const changePhoto = async () => {
    const asset = await pickImage();
    if (!asset) return;
    const { file, error } = buildUpload(asset);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('file', file);
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
    const { file, error } = buildUpload(asset);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setUploadingId(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
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
      // Apple 1.2: stop objectionable material before it is posted.
      const bioProblem = objectionableError(form.bio);
      if (bioProblem) {
        setBioError(bioProblem);
        throw Object.assign(new Error(bioProblem), { isBioError: true });
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
          lookingFor: form.lookingFor,
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
      // A DOB parse error or a blocked-word error is already shown inline next
      // to its own field; a toast on top would just repeat it.
      if (err?.isDobError || err?.isBioError) return;
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

  // These two also clear their own inline error, so they cannot be plain
  // fieldHandlers entries — but they must still be stable, or every keystroke
  // anywhere in the form re-renders the bio box and the date field with them.
  // Clearing unconditionally is safe: React bails out on an unchanged value.
  const setDateOfBirth = useCallback(
    (v) => {
      fieldHandlers.dateOfBirth(v);
      setDobError('');
    },
    [fieldHandlers]
  );
  const setBio = useCallback(
    (v) => {
      fieldHandlers.bio(v);
      setBioError('');
    },
    [fieldHandlers]
  );

  // Return-key path (UX-708): only the two adjacent text pairs chain
  // (name → date of birth, city → phone). The other fields sit next to chip
  // groups or multiline boxes, where a forced focus jump scrolls the form
  // out from under the reader.
  const dobRef = useRef(null);
  const phoneRef = useRef(null);
  const facebookRef = useRef(null);
  const focusDob = useCallback(() => dobRef.current?.focus(), []);
  const focusPhone = useCallback(() => phoneRef.current?.focus(), []);
  const focusFacebook = useCallback(() => facebookRef.current?.focus(), []);
  const genderHandlers = useMemo(
    () =>
      Object.fromEntries(
        GENDERS.map((g) => [g, () => setForm((f) => ({ ...f, gender: f.gender === g ? '' : g }))])
      ),
    []
  );

  // One choice, never cleared to empty: the backend field is not nullable.
  const lookingForHandlers = useMemo(
    () =>
      Object.fromEntries(
        LOOKING_FOR.map(({ value }) => [value, () => setForm((f) => ({ ...f, lookingFor: value }))])
      ),
    []
  );

  // Until the profile is here there is no form to show (UX-706). An empty
  // form would be worse than a wait: saving it would overwrite the real
  // profile with blanks. Skeleton while loading, LoadError with retry on
  // failure. The cached profile normally makes both invisible.
  if (!me) {
    return (
      <Screen back title="Edit Profile">
        {meFailed ? (
          <LoadError what="your profile" onRetry={refetchMe} />
        ) : (
          <View testID="profile-edit-loading" style={{ marginTop: spacing[2] }}>
            <SkeletonCard lines={6} />
          </View>
        )}
      </Screen>
    );
  }

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
            style={({ pressed }) => ({
              // minHeight, not height — at large OS text the label is taller
              // than the pill and a fixed height clips it (same rule as
              // profile.jsx). 44 as a real box, not 34 plus hitSlop: the web
              // build drops hitSlop, so it was a 34pt target there (DEEP-08).
              minHeight: 44,
              paddingVertical: spacing[2],
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: t.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing[3],
              opacity: pressed || uploadingPhoto ? 0.7 : 1,
            })}
          >
            <Text
              maxFontSizeMultiplier={fontScaleCaps.body}
              style={{ fontSize: 14, fontWeight: '600', color: t.blueDeep }}
            >
              {uploadingPhoto ? 'Uploading…' : 'Change photo'}
            </Text>
          </Pressable>
        </View>

        <SectionTitle>About you</SectionTitle>
        <Input
          label="Full name"
          value={form.name}
          onChangeText={set('name')}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusDob}
          style={FIELD_GAP}
        />
        <Input
          ref={dobRef}
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={setDateOfBirth}
          error={dobError}
          helper="Any way you like: 1953-05-14 or 14 May 1953. Only your age shows to others."
          autoCapitalize="none"
          textContentType="birthdate"
          autoComplete="birthdate-full"
          style={FIELD_GAP}
        />
        <Input
          label="About you"
          value={form.bio}
          onChangeText={setBio}
          error={bioError}
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
          textContentType="jobTitle"
          autoComplete="organization-title"
          style={FIELD_GAP}
        />
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 8 }}>
          Sex (optional)
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Sex (optional)"
          style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}
        >
          {GENDERS.map((g) => (
            <Chip
              key={g}
              label={g}
              accessibilityRole="radio"
              aria-checked={form.gender === g}
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
        {isHelper ? (
          <ChipsField
            label="My hobbies"
            value={form.extraTags}
            onChangeText={set('extraTags')}
            helper="Things you love doing. One at a time, press return after each."
            style={FIELD_GAP}
          />
        ) : (
          // One answer, so one choice. A typed list here sent the wrong shape
          // to the enum field and blanked the screen on the way back in.
          <View style={FIELD_GAP}>
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, marginBottom: 8 }}>
              What I&apos;m looking for
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="What I'm looking for"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {LOOKING_FOR.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  accessibilityRole="radio"
                  aria-checked={form.lookingFor === value}
                  onPress={lookingForHandlers[value]}
                />
              ))}
            </View>
          </View>
        )}
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
          autoCapitalize="words"
          textContentType="addressCity"
          autoComplete="postal-address-locality"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusPhone}
          style={FIELD_GAP}
        />
        {shouldAskForLocation ? (
          // Secondary: this screen pins one filled sky-blue button and it is
          // Save Changes (HCI 8). Dismissible, because a typed town has to keep
          // working for anybody who says no (HCI 3).
          <LocationPrimer
            status={locStatus}
            busy={locBusy}
            context="profile"
            actionVariant="secondary"
            onEnable={savePositionFromPhone}
            onDismiss={hideLocationCard}
          />
        ) : null}
        <Input
          ref={phoneRef}
          label="Phone number"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          helper="Only shared after both people reach the Phone Ready trust stage."
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusFacebook}
          style={FIELD_GAP}
        />
        <Input
          ref={facebookRef}
          label="Facebook link (optional)"
          value={form.facebookUrl}
          onChangeText={set('facebookUrl')}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
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
              ? 'Your ID is verified. It earns profile trust points.'
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
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
          // Clear the home-indicator gesture zone (rulebook: never pin the
          // primary under the system bar) — same pattern as feedback.
          paddingBottom: Math.max(insets.bottom, spacing[3]),
          gap: spacing[2],
        }}
      >
        <Button
          title={save.isPending ? 'Saving…' : 'Save Changes'}
          variant="primary"
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={async () => {
            // A filled form must never vanish on one silent tap (rulebook:
            // confirm genuinely irreversible data loss).
            const dirty =
              initialFormRef.current &&
              JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
            if (!dirty) return router.back();
            const ok = await confirm({
              title: 'Discard your changes?',
              message: 'Nothing you typed here will be saved.',
              cancelLabel: 'Keep editing',
              confirmLabel: 'Discard changes',
              destructive: true,
            });
            if (ok) router.back();
          }}
        />
      </View>
    </Screen>
  );
}
