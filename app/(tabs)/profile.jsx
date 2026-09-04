// Profile — avatar + stats row (Trust · Friends · Streak, Instagram-profile
// shaped), my reviews, then quiet settings rows. Night mode is opt-in here
// (never OS-driven); destructive account actions live at the very bottom,
// clearly separated (HCI: destructive-nav-separation).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, Text, View } from 'react-native';
import {
  Archive,
  BookOpen,
  Briefcase,
  CalendarCheck,
  ChevronRight,
  FileText,
  KeyRound,
  Lock,
  Mail,
  MessageSquareHeart,
  Moon,
  PhoneCall,
  Monitor,
  ShieldCheck,
  Users,
  UserX,
  Vibrate,
} from '../../src/components/icons';
import api from '../../src/api/client';
import { getMyStreak } from '../../src/api/streaks';
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
import { MY_DATA, saveMyDataCopy } from '../../src/lib/myDataCopy';
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
        {/* Plain hyphen, not an em dash: CLAUDE.md rule 5 bans the character
            outright, and a machine check with no exceptions is worth more than
            a nuanced one. It still reads as "no number yet". */}
        {value ?? '-'}
      </Text>
      <Text style={{ fontSize: type.meta, color: gold ? t.trustGold : t.inkSlate }}>{label}</Text>
    </View>
  );
}

// 3h list row: 18px leading slot (icon, score, or custom), 15px label,
// chevron or a passed control. `icon` may be a component or a render fn.
function Row({ icon: Icon, label, onPress, right, destructive, divider, a11yRole, a11yState }) {
  const { t, spacing } = useTheme();
  // Every icon in src/components/icons is a plain function (no forwardRef, no
  // $$typeof) since the lucide barrel was dropped, so the old "$$typeof means
  // a real icon" test sent every row down the bare <Icon /> branch: 24px,
  // currentColor (black), stroke 2, in a 22pt slot. One call for all of them
  // now; custom slots (the tortoise, the gold trust shield) ignore the props.
  const leading = <Icon size={18} color={destructive ? t.red : t.inkSlate} strokeWidth={1.8} />;
  return (
    <Pressable
      // No onPress → a plain container row: the control it hosts (e.g. a
      // native Switch) is the single accessibility stop, Apple-style.
      accessible={!!onPress}
      accessibilityRole={onPress ? (a11yRole ?? 'button') : undefined}
      accessibilityState={onPress ? a11yState : undefined}
      accessibilityLabel={onPress && typeof label === 'string' ? label : undefined}
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
  // Same seat guards the old Menu drawer used for these surfaces.
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';
  const isHelper = user?.role === 'HELPER' || user?.role === 'BOTH';
  const isFamily = user?.role === 'FAMILY';
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
    queryFn: getMyStreak,
  });
  const { data: myReviews } = useQuery({
    queryKey: ['reviews-mine'],
    queryFn: async () => (await api.get('/reviews/mine')).data,
  });

  const friendsCount = (connections ?? []).filter((c) => c.status === 'ACTIVE').length;

  // Pull-to-refresh (UX-704): reload exactly the feeds this tab shows — a
  // blanket invalidateQueries() would stampede every mounted screen at once.
  const queryClient = useQueryClient();
  const reload = () =>
    Promise.all(
      ['profile-me', 'trust-my-score', 'connections', 'streak-me', 'reviews-mine'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    );

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

  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message:
        'You will need your username and password to get back in. If you are not sure you have them, stay logged in.',
      cancelLabel: 'Stay logged in',
      // A verb naming the consequence, never a bare "Continue" (rulebook).
      confirmLabel: 'Log out',
    });
    if (ok) logout();
  };

  const [exporting, setExporting] = useState(false);

  /**
   * "Send me a copy of my data", and it has to actually arrive.
   *
   * GET /account/export returns everything in the response body and no email is
   * sent anywhere. This used to await the call, throw the body away and say
   * "check your email", so nothing ever reached the person who asked (audit
   * finding V2). The body now goes to saveMyDataCopy, which downloads it on the
   * web build and offers the share sheet on a phone, and the message she reads
   * afterwards is whichever of those actually happened.
   */
  const exportData = async () => {
    if (exporting) return; // double-taps must not fire double exports (HCI rule 1)
    setExporting(true);
    try {
      const { data } = await api.get('/account/export');
      const kept = await saveMyDataCopy(data);
      // She closed the share sheet without keeping it anywhere. Claiming a save
      // there would be the same lie in a smaller font.
      if (kept !== 'dismissed') {
        showToast(kept === 'saved' ? MY_DATA.saved : MY_DATA.shared, 'success');
      }
    } catch {
      showToast(MY_DATA.failed, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen fab onRefresh={reload}>
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
            style={({ pressed }) => ({
              // minHeight, not height — the label has to grow at 200% text
              // scale. 44 as a real box, not 36 plus hitSlop: the web build
              // drops hitSlop, so the pill was a 36pt target there (DEEP-08).
              minHeight: 44,
              paddingVertical: spacing[2],
              paddingHorizontal: 15,
              borderRadius: 22,
              // iOS tonal pill — filled wash, no outline (owner call 2026-08-17)
              backgroundColor: t.surfaceFill,
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

      {/* My places — the four pages that lived only in the old Menu drawer
          (removed 2026-08-19, owner call: Add friends took its slot). Without
          these rows they would be unreachable. Same role guards the drawer
          used: family circle and boxes are the elder seat's, offers are the
          helper's, check-in belongs to everyone with a streak. */}
      {!isFamily ? (
        <Card style={{ marginTop: spacing[3] }} contentStyle={{ paddingVertical: 2 }}>
          {isHelper ? (
            <Row
              icon={Briefcase}
              label="My offers & jobs"
              onPress={() => router.push('/my-jobs')}
              divider
            />
          ) : null}
          {!isFamily ? (
            <Row icon={CalendarCheck} label="Daily check-in" onPress={() => router.push('/checkin')} divider={isElder} />
          ) : null}
          {isElder ? (
            <>
              <Row icon={Users} label="My Family" onPress={() => router.push('/family')} divider />
              <Row icon={Archive} label="My boxes" onPress={() => router.push('/pass-on')} />
            </>
          ) : null}
        </Card>
      ) : null}

      {/* The 3h list: Trust Score · Peekaboo · Guide · Night mode · SOS */}
      <Card style={{ marginTop: spacing[3] }} contentStyle={{ paddingVertical: 2 }}>
        <Row
          // The shield-check is trust's own glyph (owner call 2026-08-22, the
          // nav bar's trust button) in the gold reserved for trust; the score
          // itself already sits in the Trust stat above, so the row no longer
          // repeats the number as its icon (owner call 2026-08-28).
          icon={() => <ShieldCheck size={18} color={t.trustGold} strokeWidth={1.8} />}
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
        {/* The same page App Store Connect's Support URL points at. A reviewer
            reaches it by address; everyone else needs it here, because a person
            who cannot work something out does not go looking for a URL. */}
        <Row icon={Mail} label="Get help" onPress={() => router.push('/support')} divider />
        <Row
          icon={Moon}
          label="Night mode"
          divider
          right={
            // The switch IS the control (owner call 2026-08-17: Apple feel —
            // the hand-off row-tap gave none of the native press response).
            <Switch
              accessibilityLabel="Night mode"
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{ false: t.slateSoft, true: t.blue }}
              ios_backgroundColor={t.slateSoft}
            />
          }
        />
        {/* Phones only. expo-haptics has no web implementation and the haptic
            layer returns early on web, so in the browser this switch would
            turn nothing on or off — a control that does nothing, sitting right
            under a night-mode row that works (DEEP-31). */}
        {Platform.OS === 'web' ? null : (
          <Row
            icon={Vibrate}
            label="Vibration feedback"
            divider
            right={
              <Switch
                accessibilityLabel="Vibration feedback"
                value={hapticsOn}
                onValueChange={(next) => setHapticsEnabled(next)}
                trackColor={{ false: t.slateSoft, true: t.blue }}
                ios_backgroundColor={t.slateSoft}
              />
            }
          />
        )}
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
        {/* Lock, not the shield-check: that glyph means trust on this screen. */}
        <Row icon={Lock} label="Privacy policy" onPress={() => router.push('/privacy')} divider />
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

      {/* Last on the page (owner call 2026-08-28: "log out should be last in
          profile, not the account and data"). HCI heuristic 3, user control
          and freedom: one tap used to end the session outright. For this
          audience, finding a username and password again is the single most
          likely way to lose an account for good, so the tap that costs that
          much asks first. Account deletion keeps its own two confirmations in
          the fold above; this is one, because logging out is recoverable for
          anyone who has their password. */}
      <Button
        title="Log out"
        variant="secondary"
        onPress={confirmLogout}
        style={{ marginTop: spacing[6] }}
      />
    </Screen>
  );
}
