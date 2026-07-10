// The feed's opening breath — a personal serif greeting straight on the
// parchment (no box). Editorial warmth, not another card.
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
          fontSize: text['2xl'],
          lineHeight: 40,
          color: t.ink,
          letterSpacing: -0.7,
        }}
      >
        {greeting()}{firstName ? `, ${firstName}` : ''}.
      </Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 4 }}>{today}</Text>
    </View>
  );
}
