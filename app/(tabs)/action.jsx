// Center action — the big blue button's destination.
// Elder (and BOTH): post a request (web ElderDashboard form: title, category,
// urgency, description; OTHER folds its detail into the description).
// Helper: browse ALL open requests with one-tap apply.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { RequestRow, useApplyMutations } from '../../src/components/home/OpenRequestsCard';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { CATEGORY } from '../../src/lib/needs';
import { centerActionFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

function FieldLabel({ children }) {
  const { t, type } = useTheme();
  return (
    <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 8 }}>
      {children}
    </Text>
  );
}

// Post Help (3e): title input, kind-of-help chips, Normal/Urgent, optional
// details, bottom-pinned primary. Validation is inline on the fields.
function PostNeedForm() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { showToast } = useToast();
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
    onError: (err) => showToast(err?.response?.data?.message || 'Failed to post. Please try again.', 'error'),
  });

  const submit = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Please give your request a short title.';
    if (form.category === 'OTHER' && !form.categoryOther.trim())
      errs.categoryOther = 'Please tell us what kind of help you need.';
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
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5 }}
        >
          Post Help
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 3, marginBottom: 18 }}>
          Tell your neighbors what you need.
        </Text>

        <Input
          label="Title"
          value={form.title}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, title: v }));
            setFieldErrors((f) => ({ ...f, title: '' }));
          }}
          error={fieldErrors.title}
          helper='Short and clear, like "A ride to the clinic on Thursday".'
          style={{ marginBottom: spacing[4] }}
        />

        <FieldLabel>Kind of help</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] }}>
          {Object.entries(CATEGORY).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={form.category === value}
              onPress={() => setForm((f) => ({ ...f, category: value }))}
            />
          ))}
        </View>

        {form.category === 'OTHER' ? (
          <Input
            label="What kind of help?"
            value={form.categoryOther}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, categoryOther: v }));
              setFieldErrors((f) => ({ ...f, categoryOther: '' }));
            }}
            error={fieldErrors.categoryOther}
            style={{ marginBottom: spacing[4] }}
          />
        ) : null}

        <FieldLabel>How soon?</FieldLabel>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
          <Chip
            label="Normal"
            selected={form.urgency === 'NORMAL'}
            onPress={() => setForm((f) => ({ ...f, urgency: 'NORMAL' }))}
          />
          <Chip
            label="Urgent"
            selected={form.urgency === 'URGENT'}
            onPress={() => setForm((f) => ({ ...f, urgency: 'URGENT' }))}
          />
        </View>

        <Input
          label="Details (optional)"
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
        />
      </ScrollView>

      {/* Bottom-pinned primary — the ONE filled action on this screen */}
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] }}>
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

function BrowseRequests() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { apply, withdraw } = useApplyMutations();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['needs-open'],
    queryFn: async () => (await api.get('/needs/open')).data,
  });
  const needs = Array.isArray(data) ? data : data?.content ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['needs-open'] });
    setRefreshing(false);
  };

  // Virtualized (50+ items rule): each request is its own card in a FlatList.
  return (
    <FlatList
      data={isLoading ? [] : needs}
      keyExtractor={(need) => need.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
      contentContainerStyle={{ paddingBottom: spacing[12], gap: spacing[3] }}
      ListHeaderComponent={
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fontFamily.display,
            fontSize: text.lg,
            color: t.ink,
            marginBottom: spacing[2],
          }}
        >
          Open requests
        </Text>
      }
      ListEmptyComponent={
        <Card>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
              No open requests right now. Pull down to refresh, or check back soon.
            </Text>
          )}
        </Card>
      }
      renderItem={({ item }) => (
        <Card style={{ paddingTop: spacing[2] }}>
          <RequestRow need={item} apply={apply} withdraw={withdraw} divider={false} />
        </Card>
      )}
    />
  );
}

export default function ActionScreen() {
  const { user } = useAuth();
  const action = centerActionFor(user?.role);

  return action.key === 'find' ? (
    <Screen title={action.label} scroll={false}>
      <BrowseRequests />
    </Screen>
  ) : (
    // 3e owns its header (serif title + subtitle) and pins its primary
    <Screen scroll={false} keyboard contentStyle={{ padding: 0, paddingTop: 12 }}>
      <PostNeedForm />
    </Screen>
  );
}
