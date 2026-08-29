// Demo accounts — a QUIET footer affordance under the auth forms (a hairline
// "or" divider + two soft buttons), not a promo banner above them. Demo
// logins bypass the rate limiter; one tap, no signup (elder-first trial).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import TextLink from './ui/TextLink';
import { SIGN_IN_DEVICE_ERROR, yearsOld } from '../lib/copy';

// Ages track the demo accounts' seeded birthdates (DemoDataSeeder) — same as
// web. Sarah (FAM-406, 2026-07-19) is the seeded FAMILY seat: fixed sub line,
// no computed age (web parity — she's introduced by relationship, not age).
const DEMO = {
  ELDER: { identifier: 'elder', password: '12345678', label: 'Try as an Elder', sub: `Margaret, ${yearsOld('1953-05-14')}` },
  HELPER: { identifier: 'helper', password: '123456789', label: 'Try as a Helper', sub: `Harsha, ${yearsOld('2003-03-14')}` },
  FAMILY: { identifier: 'demo.sarah@towin.app', password: 'DemoSarah!2026', label: 'Try as Family', sub: "Sarah, Margaret's daughter" },
};

// `collapsed` folds the three seats behind one line of text. Login leaves them
// open — one tap with no typing is the whole point of the demo seats there
// (owner call 2026-08-16). Register is the opposite case: someone on that page
// has already decided to sign up, so three more buttons under a form that
// already carries five fields is just noise (owner call 2026-08-19, "too many
// buttons and no free white space").
export default function DemoAccountsCard({ onError, collapsed = false }) {
  const { t, spacing, radius, type } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState('');
  const [open, setOpen] = useState(!collapsed);

  const handleGuest = async (role) => {
    setGuestLoading(role);
    onError?.('');
    try {
      const { identifier, password } = DEMO[role];
      const { data } = await api.post('/auth/login', { identifier, password });
      // login() returns false when this device rejects the token (malformed, or
      // already expired against a clock set far ahead). Navigating anyway put
      // the person back on Login with nothing said. Same handling as login.jsx.
      if (!(await login(data.token))) {
        onError?.(SIGN_IN_DEVICE_ERROR);
        return;
      }
      router.replace('/'); // index routes by role/verification state
    } catch (err) {
      onError?.(
        err?.response?.status === 429
          ? err.response.data?.message || 'Too many attempts. Please try again later.'
          : 'Could not start demo session. Please try again.'
      );
    } finally {
      setGuestLoading('');
    }
  };

  // One chip recipe for all three seats — layout (half column vs full row)
  // is the only thing that varies, so it's the only argument.
  const renderChip = (role, layout) => (
    <Pressable
      key={role}
      accessibilityRole="button"
      accessibilityLabel={DEMO[role].label}
      accessibilityState={{ disabled: !!guestLoading, busy: guestLoading === role }}
      disabled={!!guestLoading}
      onPress={() => handleGuest(role)}
      style={({ pressed }) => ({
        ...layout,
        minHeight: 54,
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.fieldLine,
        borderRadius: radius.input,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing[2],
        opacity: pressed || (guestLoading && guestLoading !== role) ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.blueDeep }}>
        {guestLoading === role ? 'Opening…' : DEMO[role].label}
      </Text>
      <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>{DEMO[role].sub}</Text>
    </Pressable>
  );

  // Folded: one line, no divider, no chrome. The divider and the explaining
  // sentence are part of what made the page feel full, so they wait behind the
  // tap too — the label carries the offer on its own.
  if (!open) {
    return (
      <View style={{ marginTop: spacing[8] }}>
        <TextLink label="Just looking? Try a sample account" onPress={() => setOpen(true)} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing[6] }}>
      {/* hairline "or" divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        <Text style={{ fontSize: type.caption, color: t.inkFaint2, letterSpacing: 1, textTransform: 'uppercase' }}>
          or
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      </View>

      <Text style={{ fontSize: type.meta, color: t.inkSlate, textAlign: 'center', marginTop: spacing[4], marginBottom: spacing[3] }}>
        Just want to see how it works? Look around with a sample account.
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {renderChip('ELDER', { flex: 1 })}
        {renderChip('HELPER', { flex: 1 })}
      </View>
      {/* FAM-406 (2026-07-19): the family chip's label + sub don't fit a half
          column, so it takes the full row below the pair (mirrors the
          register role cards). */}
      {renderChip('FAMILY', { marginTop: spacing[2] })}
    </View>
  );
}
