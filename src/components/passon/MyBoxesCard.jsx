// My boxes — the way in to "What I pass on", on the elder's home.
//
// The summary line is the reason the card exists: "My boxes" on its own names
// a door and nothing behind it; "3 stories · 2 letters · your box is shut" is
// her own page read back to her, so she knows what she is opening before she
// taps (web ElderDashboard parity).
//
// Counts only — never a title, never a word of what she wrote. Both calls may
// fail quietly: a wrong count on this card is worse than no card, and she can
// always reach the page from the menu. Held back until the real counts are
// in, so the card is never on screen saying nothing.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Archive } from '../icons';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { MY_BOXES } from '../../lib/passOnLocks';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function MyBoxesCard() {
  const { t, text, type, fontFamily, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // Offered to exactly whoever the pass-on page would let in, so this card
  // can never open a door that bounces them straight back.
  const canPassOn = user?.role === 'ELDER' || user?.role === 'BOTH';

  // The pass-on page's own two keys, not a private summary key: everything
  // that changes these counts happens on that page, and its reload() already
  // refreshes exactly these. A key of our own went stale for the whole
  // session, because nothing anywhere invalidated it.
  const { data: mine } = useQuery({
    queryKey: ['passon-mine'],
    queryFn: async () => (await api.get('/passon/mine')).data,
    enabled: canPassOn,
  });
  const { data: setup } = useQuery({
    queryKey: ['passon-setup'],
    queryFn: async () => (await api.get('/passon/setup')).data,
    enabled: canPassOn,
  });

  // Held back until the counts are really in. A failed setup call does not
  // take the card down on its own: "your box is shut" is simply left unsaid.
  if (!canPassOn || !mine) return null;
  const boxes = {
    stories: mine.stories?.length || 0,
    letters: mine.letters?.length || 0,
    shut: !!setup?.armed,
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: t.greenTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Archive size={16} color={t.trustGold} strokeWidth={2.2} />
        </View>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: type.cardTitle,
            color: t.ink,
            letterSpacing: -0.3,
          }}
        >
          {MY_BOXES.title}
        </Text>
      </View>

      <Text style={{ fontSize: text.base, color: t.inkSlate, lineHeight: 26, marginTop: spacing[2] }}>
        {MY_BOXES.lead}
      </Text>
      <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 22, marginTop: 4 }}>
        {MY_BOXES.summary(boxes)}
      </Text>

      {/* A quiet outline — the filled blue on the home screen belongs to
          asking for help, not to reading her own page. */}
      <Button
        title={MY_BOXES.open}
        variant="secondary"
        onPress={() => router.push('/pass-on')}
        style={{ alignSelf: 'flex-start', marginTop: spacing[4] }}
      />
    </Card>
  );
}
