// Profile — avatar + stats row (Trust · Friends · Streak, Instagram-profile
// shaped), my reviews, then quiet settings rows. Night mode is opt-in here
// (never OS-driven); destructive account actions live at the very bottom,
// clearly separated (HCI: destructive-nav-separation).
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, Switch, Text, View } from 'react-native';
import {
  BookOpen,
  ChevronRight,
  FileText,
  KeyRound,
  MessageSquareHeart,
  Moon,
  PhoneCall,
  ShieldCheck,
  UserPen,
} from 'lucide-react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

function Stat({ value, label, gold }) {
  const { t, text } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontSize: text.xl,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          color: gold ? t.trustGold : t.ink,
        }}
      >
        {value ?? '—'}
      </Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Row({ icon: Icon, label, onPress, right, destructive }) {
  const { t, spacing, text } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        minHeight: 52,
        paddingVertical: spacing[2],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={22} color={destructive ? t.redDeep : t.inkSlate} />
      <Text style={{ flex: 1, fontSize: text.base, color: destructive ? t.redDeep : t.ink }}>{label}</Text>
      {right ?? <ChevronRight size={20} color={t.ink4} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t, spacing, text, fontFamily, mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const { data: profile } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });
  const { data: myReviews } = useQuery({
    queryKey: ['reviews-mine'],
    queryFn: async () => (await api.get('/reviews/mine')).data,
  });

  const friendsCount = (connections ?? []).filter((c) => c.status === 'ACTIVE').length;
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/account'),
    onSuccess: async () => {
      showToast('Your account has been deleted.', 'info');
      await logout();
    },
    onError: () => showToast('Could not delete the account right now. Please try again.', 'error'),
  });

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, friendships, messages, and requests. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'There is no way back after this.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete forever', style: 'destructive', onPress: () => deleteAccount.mutate() },
            ]),
        },
      ]
    );

  const exportData = async () => {
    try {
      await api.get('/account/export');
      showToast('Your data export is ready — check your email.', 'success');
    } catch {
      showToast('Could not start the export. Please try again.', 'error');
    }
  };

  return (
    <Screen title="Profile">
      {/* Identity + stats (Instagram-profile shaped) */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Avatar name={profile?.name} uri={profile?.photoUrl} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}>
              {profile?.name ?? '…'}
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
              {user?.role === 'BOTH' ? 'Elder & Helper' : user?.role === 'HELPER' ? 'Helper' : 'Elder'}
              {profile?.city ? ` · ${profile.city}` : ''}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing[5],
            paddingTop: spacing[4],
            borderTopWidth: 1,
            borderTopColor: t.hairline,
          }}
        >
          <Stat value={trust ? Math.round(trust.totalScore) : undefined} label="trust" gold />
          <Stat value={friendsCount} label="friends" />
          <Stat value={streak?.currentStreak ?? 0} label="day streak" />
        </View>
      </Card>

      {/* Reviews about me */}
      {(myReviews ?? []).length > 0 ? (
        <Card style={{ marginTop: spacing[4] }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
          >
            What friends say about me
          </Text>
          {myReviews.slice(0, 3).map((r, i) => (
            <View
              key={r.id ?? i}
              style={{
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.hairline,
              }}
            >
              <Text style={{ fontSize: text.sm, color: t.trustGold, fontWeight: '600' }}>
                {'★'.repeat(Math.round(r.rating ?? 0))}
              </Text>
              {r.comment ? (
                <Text style={{ fontSize: text.base, lineHeight: 25, color: t.ink2, marginTop: 2 }}>
                  {r.comment}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {/* Settings */}
      <Card style={{ marginTop: spacing[4] }}>
        <Row icon={UserPen} label="Edit my profile" onPress={() => router.push('/profile-edit')} />
        <Row icon={KeyRound} label="Change password" onPress={() => router.push('/change-password')} />
        {isElder ? (
          <Row icon={PhoneCall} label="Emergency contacts" onPress={() => router.push('/emergency-contacts')} />
        ) : null}
        <Row
          icon={Moon}
          label="Night mode"
          onPress={toggle}
          right={
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{ true: t.blue, false: Platform.OS === 'android' ? t.greyLine2 : undefined }}
              accessibilityLabel="Night mode"
            />
          }
        />
        <Row icon={BookOpen} label="How ToWin works" onPress={() => router.push('/guide')} />
        <Row icon={MessageSquareHeart} label="Share feedback" onPress={() => router.push('/feedback')} />
        <Row icon={ShieldCheck} label="Privacy policy" onPress={() => router.push('/privacy')} />
        <Row icon={FileText} label="Terms of service" onPress={() => router.push('/terms')} />
      </Card>

      <Button title="Log out" variant="secondary" onPress={logout} style={{ marginTop: spacing[5] }} />

      {/* Account — separated from everything else on purpose */}
      <Card style={{ marginTop: spacing[6] }}>
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.inkSlate, marginBottom: spacing[2] }}>
          My data
        </Text>
        <Button title="Send me a copy of my data" variant="text" onPress={exportData} />
        <Button
          title={deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
          variant="destructive"
          onPress={confirmDelete}
          loading={deleteAccount.isPending}
          style={{ marginTop: spacing[3] }}
        />
      </Card>
    </Screen>
  );
}
