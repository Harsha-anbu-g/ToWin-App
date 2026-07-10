// Log in / Create account segmented switcher at the top of both auth cards —
// ported from the web. The active chip sits lighter than the track (elevation
// via surface contrast, no shadow — mobile design rule).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';

export default function AuthSwitcher({ active }) {
  const { t, spacing, radius, text } = useTheme();
  const router = useRouter();

  const segments = [
    { key: 'login', label: 'Log in', href: '/(auth)/login' },
    { key: 'register', label: 'Create account', href: '/(auth)/register' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        backgroundColor: t.surface2,
        borderRadius: radius.pill,
        padding: 5,
        marginBottom: spacing[6],
      }}
    >
      {segments.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            disabled={isActive}
            onPress={() => router.replace(href)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? t.segActive : 'transparent',
              borderWidth: isActive ? 1 : 0,
              borderColor: t.border,
            }}
          >
            <Text
              style={{
                fontSize: text.sm,
                fontWeight: '600',
                color: isActive ? t.blueDeep : t.ink3,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
