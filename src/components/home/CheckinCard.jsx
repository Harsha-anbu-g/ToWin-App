// Daily check-in card — the top of the elder feed (web: Streaks page).
// One tap says "I'm okay"; the state flips instantly (HCI rule 1).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import api from '../../api/client';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export default function CheckinCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });

  const checkin = useMutation({
    mutationFn: async () => (await api.post('/streaks/checkin')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['streak-me'], data);
      showToast('Checked in — see you tomorrow!', 'success');
    },
    onError: () => showToast('Could not check in right now. Please try again.', 'error'),
  });

  const done = streak?.alreadyCheckedIn;
  const current = streak?.currentStreak ?? 0;

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        Daily check-in
      </Text>
      {done ? (
        <View
          style={{
            backgroundColor: t.greenTint,
            borderRadius: 11,
            padding: spacing[3],
            marginTop: spacing[3],
          }}
        >
          <Text style={{ fontSize: text.base, color: t.greenDeep, lineHeight: 25 }}>
            You're checked in for today{current > 0 ? ` — ${current}-day streak` : ''}. See you
            tomorrow!
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: text.base, color: t.inkSlate, lineHeight: 26, marginTop: spacing[2] }}>
            One tap a day tells your people you're okay
            {current > 0 ? ` — you're on a ${current}-day streak.` : '.'}
          </Text>
          <Button
            title={checkin.isPending ? 'Checking in…' : "I'm here today"}
            variant="primary"
            onPress={() => checkin.mutate()}
            loading={checkin.isPending}
            style={{ marginTop: spacing[4] }}
          />
        </>
      )}
    </Card>
  );
}
