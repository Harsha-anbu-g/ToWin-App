// LoadError — the calm "couldn't load" card (silent-failure audit AUD-102).
// A failed fetch must never masquerade as a real empty state: elders on weak
// wifi were seeing "No conversations yet" when the network simply dropped.
// Plain words, one obvious retry, no alarm colors (reds stay semantic-severe).
import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';
import Card from './Card';

export default function LoadError({ what = 'this', onRetry, style }) {
  const { t, spacing, text } = useTheme();
  return (
    <Card style={style}>
      <Text style={{ fontSize: text.base, lineHeight: 27, color: t.ink2 }}>
        We couldn't load {what} right now. Please check your connection and try again.
      </Text>
      {onRetry ? (
        <Button
          title="Try again"
          variant="secondary"
          onPress={onRetry}
          style={{ marginTop: spacing[4] }}
        />
      ) : null}
    </Card>
  );
}
