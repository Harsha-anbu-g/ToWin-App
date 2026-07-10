// Terms of service — renders the shared legal content (placeholder docs).
import { Text, View } from 'react-native';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { TERMS_CONTENT } from '../src/data/legalContent';
import { useTheme } from '../src/theme/ThemeContext';

export default function Terms() {
  const { t, spacing, text } = useTheme();
  return (
    <Screen title="Terms of service">
      <Card>
        <Text
          style={{
            fontSize: 12,
            color: t.ink4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: '600',
            marginBottom: spacing[4],
          }}
        >
          Placeholder document, prototype only
        </Text>
        {TERMS_CONTENT.map((s) => (
          <View key={s.h} style={{ marginBottom: spacing[5] }}>
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>{s.h}</Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22 }}>{s.p}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
