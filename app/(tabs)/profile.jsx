// Profile — avatar + stats row (Trust · Friends · Streak, Instagram-profile
// shaped), my reviews, then quiet settings rows. Night mode is opt-in here
// (never OS-driven); destructive account actions live at the very bottom,
// clearly separated (HCI: destructive-nav-separation).
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  UserX,
} from 'lucide-react-native';
import api from '../../src/api/client';
import TortoiseMark from '../../src/components/TortoiseMark';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

function Stat({ value, label, gold }) {
  const { t } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text
        style={{
          fontSize: 19,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          color: gold ? t.trustGold : t.ink,
        }}
      >
        {value ?? '—'}
      </Text>
      <Text style={{ fontSize: 12, color: gold ? t.trustGold : t.inkSlate }}>{label}</Text>
    </View>
  );
}

// 3h list row: 18px leading slot (icon, score, or custom), 15px label,
// chevron or a passed control. `icon` may be a component or a render fn.
function Row({ icon: Icon, label, onPress, right, destructive, divider, a11yRole, a11yState }) {
  const { t, spacing } = useTheme();
  // Plain arrow fns render the custom leading slot; lucide icons (forwardRef
  // objects, $$typeof set) get the standard 18px treatment.
  const leading =
    typeof Icon === 'function' && !Icon.$$typeof ? (
      <Icon />
    ) : (
      <Icon size={18} color={destructive ? t.red : t.inkSlate} strokeWidth={1.8} />
    );
  return (
    <Pressable
      accessibilityRole={a11yRole ?? 'button'}
      accessibilityState={a11yState}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        minHeight: 48,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: t.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 22, alignItems: 'center' }}>{leading}</View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: destructive ? '600' : '400',
          color: destructive ? t.red : t.ink,
        }}
      >
        {label}
      </Text>
      {right ?? <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t, spacing, text, fontFamily, mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const { data: profile, isError: profileFailed, refetch: refetchProfile } = useQuery({
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

  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    if (exporting) return; // double-taps must not fire double exports (HCI rule 1)
    setExporting(true);
    try {
      await api.get('/account/export');
      showToast('Your data export is ready — check your email.', 'success');
    } catch {
      showToast('Could not start the export. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5 }}
      >
        Profile
      </Text>

      {profileFailed ? (
        // Without this, a dropped network leaves the name on "…" forever
        <LoadError what="your profile" onRetry={refetchProfile} style={{ marginTop: spacing[3] }} />
      ) : null}

      {/* Identity card (3h): 56px avatar, serif name, city, hairline Edit pill */}
      <Card style={{ marginTop: spacing[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <Avatar name={profile?.name} uri={profile?.photoUrl} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 21, color: t.ink }}>
              {profile?.name ?? '…'}
            </Text>
            <Text style={{ fontSize: 13, color: t.inkSlate, marginTop: 1 }}>
              {profile?.city ??
                (user?.role === 'BOTH' ? 'Elder & Helper' : user?.role === 'HELPER' ? 'Helper' : 'Elder')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/profile-edit')}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({
              height: 36,
              paddingHorizontal: 15,
              borderRadius: 18,
              backgroundColor: t.canvas,
              borderWidth: 1,
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>Edit</Text>
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing[4],
            paddingTop: spacing[3],
            borderTopWidth: 1,
            borderTopColor: t.hairline,
          }}
        >
          <Stat value={trust ? Math.round(trust.totalScore) : undefined} label="trust" gold />
          <Stat value={friendsCount} label="friends" />
          <Stat value={streak?.currentStreak ?? 0} label="day streak" />
        </View>
      </Card>

      {/* The 3h list: Trust Score · Peekaboo · Guide · Night mode · SOS */}
      <Card style={{ marginTop: spacing[3] }} contentStyle={{ paddingVertical: 2 }}>
        <Row
          icon={() => (
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
              {trust ? Math.round(trust.totalScore) : '—'}
            </Text>
          )}
          label={
            <Text>
              <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> Score
            </Text>
          }
          onPress={() => router.push('/trust')}
          divider
        />
        <Row icon={() => <TortoiseMark size={18} />} label="Peekaboo" onPress={() => router.push('/game')} divider />
        <Row icon={BookOpen} label="Guide" onPress={() => router.push('/guide')} divider />
        <Row
          icon={Moon}
          label="Night mode"
          onPress={toggle}
          divider
          a11yRole="switch"
          a11yState={{ checked: mode === 'dark' }}
          right={
            // Visual-only: the row is the single control. A touchable inside a
            // touchable gives screen readers two overlapping "Night mode" stops.
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Switch
                value={mode === 'dark'}
                trackColor={{ true: t.blue, false: Platform.OS === 'android' ? t.greyLine2 : undefined }}
              />
            </View>
          }
        />
        <Row
          icon={PhoneCall}
          label="Emergency contacts"
          onPress={() => router.push('/emergency-contacts')}
          destructive
        />
      </Card>

      {/* Everything quieter lives below the fold */}
      <Card style={{ marginTop: spacing[3] }} contentStyle={{ paddingVertical: 2 }}>
        <Row icon={KeyRound} label="Change password" onPress={() => router.push('/change-password')} divider />
        <Row icon={MessageSquareHeart} label="Share feedback" onPress={() => router.push('/feedback')} divider />
        <Row icon={UserX} label="Blocked people" onPress={() => router.push('/blocked')} divider />
        <Row icon={ShieldCheck} label="Privacy policy" onPress={() => router.push('/privacy')} divider />
        <Row icon={FileText} label="Terms of service" onPress={() => router.push('/terms')} />
      </Card>

      {(myReviews ?? []).length > 0 ? (
        <Card style={{ marginTop: spacing[3] }}>
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
              <Text
                accessibilityLabel={`${Math.round(r.rating ?? 0)} out of 5 stars`}
                style={{ fontSize: text.sm, color: t.trustGold, fontWeight: '600' }}
              >
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

      <Button title="Log out" variant="secondary" onPress={logout} style={{ marginTop: spacing[5] }} />

      {/* Account — separated from everything else on purpose */}
      <Card style={{ marginTop: spacing[6] }}>
        <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.inkSlate, marginBottom: spacing[2] }}>
          My data
        </Text>
        <Button title="Send me a copy of my data" variant="text" loading={exporting} onPress={exportData} />
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
