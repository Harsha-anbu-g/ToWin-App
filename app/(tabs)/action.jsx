// Center action — the big blue button's destination.
// Elder (and BOTH): post a request (web ElderDashboard form: title, category,
// urgency, description; OTHER folds its detail into the description).
// Helper: browse ALL open requests with one-tap apply.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { RequestRow, useApplyMutations } from '../../src/components/home/OpenRequestsCard';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { CATEGORY } from '../../src/lib/needs';
import { centerActionFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

function Chip({ label, active, onPress, accessibilityLabel }) {
  const { t, radius, text, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: spacing[4],
        borderRadius: radius.pill,
        borderWidth: active ? 2 : 1.5,
        borderColor: active ? t.blue : t.border,
        backgroundColor: active ? t.blueWash : t.canvas,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: text.sm, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PostNeedForm() {
  const { t, spacing, text, fontFamily } = useTheme();
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
  const [msg, setMsg] = useState('');

  const post = useMutation({
    mutationFn: (body) => api.post('/needs', body),
    onSuccess: () => {
      setForm({ title: '', description: '', category: 'COMPANIONSHIP', urgency: 'NORMAL', categoryOther: '' });
      setMsg('');
      queryClient.invalidateQueries({ queryKey: ['needs-mine'] });
      showToast('Help posted!', 'success');
      router.push('/(tabs)/home');
    },
    onError: (err) => setMsg(err?.response?.data?.message || 'Failed to post.'),
  });

  const submit = () => {
    if (!form.title.trim()) {
      setMsg('Please give your request a short title.');
      return;
    }
    if (form.category === 'OTHER' && !form.categoryOther.trim()) {
      setMsg('Please tell us what kind of help you need.');
      return;
    }
    setMsg('');
    const { categoryOther, ...rest } = form;
    const body = { ...rest };
    if (form.category === 'OTHER') {
      const detail = categoryOther.trim();
      body.description = body.description ? `Kind of help: ${detail}\n\n${body.description}` : `Kind of help: ${detail}`;
    }
    post.mutate(body);
  };

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        What do you need help with?
      </Text>

      {msg ? (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: t.redTint,
            borderWidth: 1,
            borderColor: t.redLine,
            borderRadius: 11,
            padding: spacing[3],
            marginTop: spacing[3],
          }}
        >
          <Text style={{ fontSize: text.sm, color: t.redError }}>{msg}</Text>
        </View>
      ) : null}

      <Input
        label="Title"
        value={form.title}
        onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
        helper='Short and clear, like "A ride to the doctor on Thursday".'
        style={{ marginTop: spacing[4], marginBottom: spacing[4] }}
      />

      <Text style={{ fontSize: text.sm, fontWeight: '500', color: t.inkSlate, marginBottom: spacing[2] }}>
        Kind of help
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] }}>
        {Object.entries(CATEGORY).map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={form.category === value}
            onPress={() => setForm((f) => ({ ...f, category: value }))}
          />
        ))}
      </View>

      {form.category === 'OTHER' ? (
        <Input
          label="What kind of help?"
          value={form.categoryOther}
          onChangeText={(v) => setForm((f) => ({ ...f, categoryOther: v }))}
          style={{ marginBottom: spacing[4] }}
        />
      ) : null}

      <Text style={{ fontSize: text.sm, fontWeight: '500', color: t.inkSlate, marginBottom: spacing[2] }}>
        How soon?
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
        <Chip
          label="Whenever works"
          active={form.urgency === 'NORMAL'}
          onPress={() => setForm((f) => ({ ...f, urgency: 'NORMAL' }))}
        />
        <Chip
          label="Urgent"
          active={form.urgency === 'URGENT'}
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
        style={{ marginBottom: spacing[5] }}
      />

      <Button
        title={post.isPending ? 'Posting…' : 'Post my request'}
        variant="primary"
        onPress={submit}
        loading={post.isPending}
      />
    </Card>
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

  return (
    <Screen title={action.label} scroll={action.key !== 'find'} keyboard={action.key !== 'find'}>
      {action.key === 'find' ? <BrowseRequests /> : <PostNeedForm />}
    </Screen>
  );
}
