// Center action — the big blue button's destination.
// Elder (and BOTH): post a request (web ElderDashboard form: title, category,
// urgency, description; OTHER folds its detail into the description).
// Helper: browse ALL open requests with one-tap apply.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { friendlyWriteError } from '../../src/api/client';
import OfferHelpList from '../../src/components/needs/OfferHelpList';
import Button from '../../src/components/ui/Button';
import Chip from '../../src/components/ui/Chip';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { objectionableError } from '../../src/lib/contentFilter';
import { CATEGORY } from '../../src/lib/needs';
import { centerActionFor } from '../../src/lib/roles';
import { tabBarSpace } from '../../src/lib/tabBarMetrics';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[4] };
const DETAILS_INPUT_STYLE = { minHeight: 100, textAlignVertical: 'top' };

function FieldLabel({ children }) {
  const { t, type } = useTheme();
  return (
    <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 8 }}>
      {children}
    </Text>
  );
}

// Ask Help (3e): title input, kind-of-help chips, Normal/Urgent, optional
// details, bottom-pinned primary. Validation is inline on the fields.
// The heading is the centre button's own label (roles.js), so the screen and
// the button a member tapped to reach it always read the same (HARD-110).
function PostNeedForm({ title }) {
  const { t, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'COMPANIONSHIP',
    urgency: 'NORMAL',
    categoryOther: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const post = useMutation({
    mutationFn: (body) => api.post('/needs', body),
    onSuccess: () => {
      setForm({ title: '', description: '', category: 'COMPANIONSHIP', urgency: 'NORMAL', categoryOther: '' });
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['needs-mine'] });
      showToast('Help posted!', 'success');
      router.push('/(tabs)/posted-help'); // lands in "Looking for Help"
    },
    onError: (err) =>
      showToast(
        friendlyWriteError(err, err?.response?.data?.message || 'Failed to post. Please try again.'),
        'error'
      ),
  });

  // Stable per-field handlers: Input and Chip are memo'd, so with these a
  // keystroke in one field no longer re-renders every sibling Paper input
  // (each animates a floating label — the source of typing lag on slow phones).
  const setTitle = useCallback((v) => {
    setForm((f) => ({ ...f, title: v }));
    setFieldErrors((f) => ({ ...f, title: '' }));
  }, []);
  const setCategoryOther = useCallback((v) => {
    setForm((f) => ({ ...f, categoryOther: v }));
    setFieldErrors((f) => ({ ...f, categoryOther: '' }));
  }, []);
  const setDescription = useCallback((v) => {
    setForm((f) => ({ ...f, description: v }));
    setFieldErrors((f) => ({ ...f, description: '' }));
  }, []);
  const setCategory = useCallback((value) => setForm((f) => ({ ...f, category: value })), []);
  const setUrgencyNormal = useCallback(() => setForm((f) => ({ ...f, urgency: 'NORMAL' })), []);
  const setUrgencyUrgent = useCallback(() => setForm((f) => ({ ...f, urgency: 'URGENT' })), []);
  // One stable handler per category chip (CATEGORY is a static map)
  const categoryHandlers = useMemo(
    () => Object.fromEntries(Object.keys(CATEGORY).map((value) => [value, () => setCategory(value)])),
    [setCategory]
  );

  const submit = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Please give your request a short title.';
    if (form.category === 'OTHER' && !form.categoryOther.trim())
      errs.categoryOther = 'Please tell us what kind of help you need.';
    // Apple 1.2: objectionable material must be stopped before it is posted.
    errs.title = errs.title || objectionableError(form.title);
    errs.description = objectionableError(form.description);
    errs.categoryOther = errs.categoryOther || objectionableError(form.categoryOther);
    Object.keys(errs).forEach((k) => { if (!errs[k]) delete errs[k]; });
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    const { categoryOther, ...rest } = form;
    const body = { ...rest };
    if (form.category === 'OTHER') {
      const detail = categoryOther.trim();
      body.description = body.description ? `Kind of help: ${detail}\n\n${body.description}` : `Kind of help: ${detail}`;
    }
    post.mutate(body);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        // 120 clears the floating glass tab bar the form now scrolls beneath
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 120 }}
      >
        <Text
          accessibilityRole="header"
          // 12 below, the same air Home puts between its heading and the
          // search field; the subtitle that used to carry this gap is gone
          // (owner call 2026-08-28: no lines under the tab headings).
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5, marginBottom: 12 }}
        >
          {title}
        </Text>

        <Input
          label="Title"
          value={form.title}
          onChangeText={setTitle}
          error={fieldErrors.title}
          helper='Short and clear, like "A ride to the clinic on Thursday".'
          style={FIELD_GAP}
        />

        <FieldLabel>Kind of help</FieldLabel>
        {/* One question, one answer: a labelled radiogroup so a screen reader
            says what is being asked and which chip answers it, instead of
            reading five unrelated buttons. */}
        {/* ONE row (owner call 2026-08-22: "make all the kind of help in a
            same row") — five options cannot physically share a phone's width
            at this text size, so the row scrolls sideways, the native iOS
            chip-rail pattern. The trailing chip peeking past the edge is the
            scroll affordance. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel="Kind of help"
          keyboardShouldPersistTaps="handled"
          style={{ marginBottom: spacing[4], marginHorizontal: -spacing[4] }}
          contentContainerStyle={{
            flexDirection: 'row',
            gap: spacing[2],
            paddingHorizontal: spacing[4],
          }}
        >
          {Object.entries(CATEGORY).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              accessibilityRole="radio"
              aria-checked={form.category === value}
              onPress={categoryHandlers[value]}
            />
          ))}
        </ScrollView>

        {form.category === 'OTHER' ? (
          <Input
            label="What kind of help?"
            value={form.categoryOther}
            onChangeText={setCategoryOther}
            error={fieldErrors.categoryOther}
            style={FIELD_GAP}
          />
        ) : null}

        <FieldLabel>How soon?</FieldLabel>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="How soon?"
          style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}
        >
          <Chip
            label="Normal"
            accessibilityRole="radio"
            aria-checked={form.urgency === 'NORMAL'}
            onPress={setUrgencyNormal}
          />
          <Chip
            label="Urgent"
            accessibilityRole="radio"
            aria-checked={form.urgency === 'URGENT'}
            onPress={setUrgencyUrgent}
          />
        </View>

        <Input
          label="Details (optional)"
          value={form.description}
          onChangeText={setDescription}
          error={fieldErrors.description}
          multiline
          numberOfLines={4}
          inputStyle={DETAILS_INPUT_STYLE}
        />
      </ScrollView>

      {/* Bottom-pinned primary — the ONE filled action on this screen. Its
          clearance is the bar's real footprint (shared tabBarMetrics): the bar
          floats as a capsule and scenes run full-height beneath it, so a plain
          12pt pad left this button dead inside the bar's band on zero-inset
          iPhones (verify sweep 2026-08-22). */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
          paddingBottom: tabBarSpace(insets) + spacing[3],
        }}
      >
        <Button
          title={post.isPending ? 'Posting…' : 'Post Help'}
          variant="primary"
          onPress={submit}
          loading={post.isPending}
        />
      </View>
    </View>
  );
}

export default function ActionScreen() {
  const { user } = useAuth();
  const action = centerActionFor(user?.role);

  // FAMILY has no center action (roles.js returns null, FAM-401) — the tab
  // is href:null for them, but imperative navigation still reaches this
  // route (game.jsx relies on that for the dashboard), so a stray push must
  // land on Home, never red-screen on action.key (FAM-407 2026-07-19).
  if (!action) return <Redirect href="/(tabs)/home" />;

  return action.key === 'find' ? (
    // 4b/4c: Offer Help owns its header + segments + radius row
    <Screen scroll={false} contentStyle={{ padding: 0, paddingTop: 12 }}>
      <OfferHelpList />
    </Screen>
  ) : (
    // 3e owns its header (serif title + subtitle) and pins its primary
    <Screen scroll={false} keyboard contentStyle={{ padding: 0, paddingTop: 12 }}>
      <PostNeedForm title={action.label} />
    </Screen>
  );
}
