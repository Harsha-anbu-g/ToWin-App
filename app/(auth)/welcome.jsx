// Welcome — the mobile replacement for the web landing story: wordmark, the
// tagline (serif, italic "two"), one filled primary. Calm, one idea.
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Button from '../../src/components/ui/Button';
import Screen from '../../src/components/ui/Screen';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function Welcome() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', marginTop: spacing[16] }}>
        <Text
          style={{
            fontSize: text.lg,
            color: t.blueTeal,
            fontWeight: '600',
            letterSpacing: 0.3,
          }}
        >
          ToWin
        </Text>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: spacing[6] }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fontFamily.display,
            fontSize: 44,
            lineHeight: 54,
            color: t.ink,
            textAlign: 'center',
            letterSpacing: -0.9,
          }}
        >
          It takes{' '}
          <Text style={{ fontFamily: 'Newsreader_400Regular_Italic' }}>two</Text>
          {'\n'}To Win
        </Text>
        <Text
          style={{
            marginTop: spacing[4],
            fontSize: text.base,
            lineHeight: 27,
            color: t.inkSlate,
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          Friendly help nearby, and friendships that grow slowly — like roots.
        </Text>
      </View>

      <View style={{ gap: spacing[3], marginBottom: spacing[8] }}>
        <Button
          title="Log in"
          variant="primary"
          onPress={() => showToast('Login opens in the next build step')}
        />
        <Button
          title="Join ToWin"
          variant="secondary"
          onPress={() => showToast('Registration opens in the next build step')}
        />
      </View>
    </Screen>
  );
}
