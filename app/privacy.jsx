// Privacy policy — renders the shared legal content (draft legal copy, web legalCopy.js parity).
import { Text, View } from 'react-native';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { DRAFT, PRIVACY_CONTENT } from '../src/data/legalContent';
import { useTheme } from '../src/theme/ThemeContext';

export default function Privacy() {
  const { t, spacing, text } = useTheme();
  return (
    <Screen back title="Privacy policy">
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
          {DRAFT.eyebrow}
        </Text>
        {/* The draft notice in full — a person deserves to know what they are
            reading has not been checked by a lawyer, and when it was written. */}
        <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22, marginBottom: 6 }}>
          {DRAFT.body}
        </Text>
        <Text style={{ fontSize: 12, color: t.ink4, marginBottom: spacing[4] }}>{DRAFT.asOf}</Text>
        {PRIVACY_CONTENT.map((s) => (
          <View key={s.h} style={{ marginBottom: spacing[5] }}>
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, marginBottom: 6 }}>{s.h}</Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22 }}>{s.p}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
