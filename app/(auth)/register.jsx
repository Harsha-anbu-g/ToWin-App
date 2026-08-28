// Register, step 1 of 2: "Who are you joining as?" on a page of its own
// (owner call 2026-08-28). The form that used to sit under the role cards now
// lives in create-account.jsx and receives the answer as a route param, so
// this page has exactly one job — the decision that shapes the whole account
// (rulebook: one idea per screen).
//
// One touch, no Continue button: each role is a hairline row that opens the
// form, the same row grammar as My Helpers and My Family (owner calls
// 2026-08-26, "no double clicking"). The form page names the choice back and
// offers Change, so a slip costs one tap (HCI 3, user control).
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from '../../src/components/icons';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { SIGNUP_ROLE_PROMPT, SIGNUP_ROLES } from '../../src/data/signupRoles';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

export default function Register() {
  const { t, type, fontFamily, pressRipple } = useTheme();
  const router = useRouter();

  const choose = (role) => router.push({ pathname: '/(auth)/create-account', params: { role } });

  return (
    // spacing[6] gutter: login.jsx's rhythm, which the owner already tuned.
    <Screen back contentStyle={{ paddingHorizontal: spacing[6] }}>
      <View style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: type.title, color: t.ink, letterSpacing: -0.5 }}
        >
          Join Towinly.
        </Text>
        <Text style={{ fontSize: type.body, color: t.ink3, marginTop: spacing[1], marginBottom: spacing[8] }}>
          Create your free account in minutes.
        </Text>

        {/* Body size and bold, the same setting finish-setup gives its role
            question (DEEP-16): this is the screen's one real question. A
            header, so a screen reader can jump straight to it. */}
        <Text
          accessibilityRole="header"
          style={{ fontSize: type.body, fontWeight: '700', color: t.ink, marginBottom: spacing[2] }}
        >
          {SIGNUP_ROLE_PROMPT}
        </Text>

        {SIGNUP_ROLES.map(({ value, label, desc }, index) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`${label}. ${desc}`}
            onPress={() => choose(value)}
            android_ripple={pressRipple}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              minHeight: 64,
              paddingVertical: spacing[3],
              // Hairlines between rows, none above the first: LinkRow's rule.
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: t.hairline,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              {/* The option's NAME at least as large as its description
                  (audit 2026-08-19): weight carries the hierarchy. */}
              <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{label}</Text>
              {/* inkSlate, not ink4: this copy decides an identity and must
                  clear 4.5:1. Body size, because it is read, not scanned, and
                  misreading it signs the person up as the wrong person. */}
              <Text style={{ fontSize: type.body, color: t.inkSlate, marginTop: spacing[1], lineHeight: 24 }}>
                {desc}
              </Text>
            </View>
            <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
          </Pressable>
        ))}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing[8],
          }}
        >
          <Text style={{ fontSize: type.body, color: t.ink3 }}>Already have an account? </Text>
          <TextLink label="Log in" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    </Screen>
  );
}
