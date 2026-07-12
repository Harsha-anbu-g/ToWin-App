// The feed's opening breath — a personal serif greeting straight on the
// page (3a: Newsreader 30, date 13). Editorial warmth, not another card.
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { greeting } from '../../lib/streaks';
import { useTheme } from '../../theme/ThemeContext';

export default function GreetingHeader() {
  const { t, spacing, text, fontFamily } = useTheme();

  const { data: me } = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await api.get('/profile/me')).data,
  });

  const firstName = me?.name?.split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={{ paddingVertical: spacing[2] }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fontFamily.display,
          fontSize: 30,
          lineHeight: 35,
          color: t.ink,
          letterSpacing: -0.6,
        }}
      >
        {greeting()}{firstName ? `, ${firstName}` : ''}.
      </Text>
      <Text style={{ fontSize: 13, color: t.inkSlate, marginTop: 4 }}>{today}</Text>
    </View>
  );
}
