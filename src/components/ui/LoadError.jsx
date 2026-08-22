// LoadError — the calm "couldn't load" card (silent-failure audit AUD-102).
// A failed fetch must never masquerade as a real empty state: elders on weak
// wifi were seeing "No conversations yet" when the network simply dropped.
// Plain words, one obvious retry, no alarm colors (reds stay semantic-severe).
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { announce } from '../../lib/announce';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';
import Card from './Card';

export default function LoadError({ what = 'this', onRetry, style, bare = false }) {
  const { t, spacing, text, fontScaleCaps } = useTheme();
  const message = `We couldn't load ${what} right now. Please check your connection and try again.`;
  // This card replaces a whole screen's worth of content. A sighted person sees
  // the swap; a screen-reader user was left on a page that had silently become
  // something else, with nothing said. accessibilityRole="alert" alone does not
  // speak on iOS or Android. Only an explicit announcement does (the same
  // reason ToastContext calls this helper).
  useEffect(() => {
    announce(message);
  }, [message]);
  const body = (
    <>
      {/* The alert wraps the sentence ONLY. `accessible` collapses whatever it
          contains into one element, so putting the retry button inside it
          would announce the failure and then hide the one way out of it. */}
      <View accessible accessibilityRole="alert">
        <Text maxFontSizeMultiplier={fontScaleCaps.body} style={{ fontSize: text.base, lineHeight: 27, color: t.ink2 }}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button
          title="Try again"
          variant="secondary"
          onPress={onRetry}
          style={{ marginTop: spacing[4] }}
        />
      ) : null}
    </>
  );
  // `bare` drops the Card shell for callers already inside a Card (no card-in-card).
  if (bare) return <View style={style}>{body}</View>;
  return <Card style={style}>{body}</Card>;
}
