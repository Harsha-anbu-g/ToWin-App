// Profile — avatar + stats row (Trust · Friends · Streak, Instagram-profile
// shaped), my reviews, then quiet settings rows. Night mode is opt-in here
// (never OS-driven); destructive account actions live at the very bottom,
// clearly separated (HCI: destructive-nav-separation).
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, Text, View } from 'react-native';
import {
  BookOpen,
  ChevronRight,
  FileText,
  KeyRound,
  MessageSquareHeart,
  Moon,
  PhoneCall,
  Monitor,
  ShieldCheck,
  UserX,
  Vibrate,
} from 'lucide-react-native';
import api from '../../src/api/client';
import TortoiseMark from '../../src/components/TortoiseMark';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { switchToFullWebsite } from '../../src/lib/fullWebsite';
import { isHapticsEnabled, setHapticsEnabled, subscribeHaptics } from '../../src/lib/haptics';
import { useTheme } from '../../src/theme/ThemeContext';

function Stat({ value, label, gold }) {
  const { t, type } = useTheme();
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
      <Text style={{ fontSize: type.meta, color: gold ? t.trustGold : t.inkSlate }}>{label}</Text>
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
          fontSize: 16, // elder floor — the whole settings list sat at 15
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
  const { t, spacing, text, type, fontFamily, mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  // Vibration feedback (rulebook §11: haptics must be user-switchable) — the
  // module holds the truth; this state only mirrors it for the Switch visual.
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());
  useEffect(() => subscribeHaptics(setHapticsOn), []);
  // Account actions stay folded until asked for (see the card at the bottom).
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: profile, isError: profileFailed, refetch: refetchProfile } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });
  // isError on every stat feed: a failed fetch must render as "—", never as
  // a confident 0 (rulebook: failed loads never masquerade as real data).
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });
  const { data: connections, isError: connectionsFailed } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: streak, isError: streakFailed } = useQuery({
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

  // Two gates, deliberately. Sequential awaits rather than a nested callback:
  // same two-stage protection, but it reads top-to-bottom and works on web.
  const confirmDelete = async () => {
    const first = await confirm({
      title: 'Delete your account?',
      message:
        'This permanently removes your profile, friendships, messages, and requests. It cannot be undone.',
      cancelLabel: 'Keep my account',
      // A verb naming the consequence — never a bare "Continue" (rulebook).
      confirmLabel: 'Delete my account',
      destructive: true,
    });
    if (!first) return;

    const second = await confirm({
      title: 'Are you absolutely sure?',
      message: 'There is no way back after this.',
      confirmLabel: 'Delete forever',
      destructive: true,
    });
    if (second) deleteAccount.mutate();
  };

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
    <Screen fab>
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
            <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 1 }}>
              {profile?.city ??
                (user?.role === 'BOTH'
                  ? 'Elder & Helper'
                  : user?.role === 'HELPER'
                    ? 'Helper'
                    : user?.role === 'FAMILY'
                      ? 'Family member'
                      : 'Elder')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/profile-edit')}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({
              // minHeight, not height — the label has to grow at 200% text scale
              minHeight: 36,
              paddingVertical: spacing[2],
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
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>Edit</Text>
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
          <Stat value={connectionsFailed ? undefined : friendsCount} label="friends" />
          <Stat
            value={streakFailed ? undefined : (streak?.currentStreak ?? undefined)}
            label="day streak"
          />
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
          icon={Vibrate}
          label="Vibration feedback"
          onPress={() => setHapticsEnabled(!hapticsOn)}
          divider
          a11yRole="switch"
          a11yState={{ checked: hapticsOn }}
          right={
            // Visual-only, same as Night mode: the row is the single control.
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Switch
                value={hapticsOn}
                trackColor={{ true: t.blue, false: Platform.OS === 'android' ? t.greyLine2 : undefined }}
              />
            </View>
          }
        />
        {/* Not destructive — red on a benign navigation row mis-signals danger
            and burns the channel Delete-account needs (rulebook). */}
        <Row
          icon={PhoneCall}
          label="Emergency contacts"
          onPress={() => router.push('/emergency-contacts')}
        />
      </Card>

      {/* Everything quieter lives below the fold */}
      <Card style={{ marginTop: spacing[3] }} contentStyle={{ paddingVertical: 2 }}>
        <Row icon={KeyRound} label="Change password" onPress={() => router.push('/change-password')} divider />
        <Row icon={MessageSquareHeart} label="Share feedback" onPress={() => router.push('/feedback')} divider />
        <Row icon={UserX} label="Blocked people" onPress={() => router.push('/blocked')} divider />
        <Row icon={ShieldCheck} label="Privacy policy" onPress={() => router.push('/privacy')} divider />
        <Row
          icon={FileText}
          label="Terms of service"
          onPress={() => router.push('/terms')}
          divider={Platform.OS === 'web'}
        />
        {/* Web only: phones are sent here from the website, so there has to be
            a way back to it (HCI 3). Invisible in the store apps, where there
            is nothing to switch to. */}
        {Platform.OS === 'web' ? (
          <Row icon={Monitor} label="Use the full website" onPress={switchToFullWebsite} />
        ) : null}
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

      {/* Account — folded away behind one row so "Delete my account" is never
          sitting in the open where a mis-tap can reach it (user call
          2026-07-26). Opening it is a deliberate act. */}
      <Card style={{ marginTop: spacing[6] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account and data"
          accessibilityState={{ expanded: accountOpen }}
          onPress={() => setAccountOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ flex: 1, fontSize: text.base, color: t.ink }}>Account and data</Text>
          <ChevronRight
            size={18}
            color={t.inkFaint2}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: accountOpen ? '90deg' : '0deg' }] }}
          />
        </Pressable>

        {accountOpen ? (
          <View style={{ marginTop: spacing[3], gap: spacing[3] }}>
            <Button title="Send me a copy of my data" variant="text" loading={exporting} onPress={exportData} />
            <Button
              title={deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
              variant="destructive"
              onPress={confirmDelete}
              loading={deleteAccount.isPending}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
