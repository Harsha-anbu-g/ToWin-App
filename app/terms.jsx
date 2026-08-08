// Terms of service. Renders the shared legal content (draft legal copy, web legalCopy.js parity).
import { Text } from 'react-native';
import LegalSections from '../src/components/legal/LegalSections';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { DRAFT, TERMS_CONTENT } from '../src/data/legalContent';
import { useTheme } from '../src/theme/ThemeContext';

export default function Terms() {
  const { t, spacing, text } = useTheme();
  return (
    <Screen back title="Terms of service">
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
        {/* The draft notice in full. A person deserves to know what they are
            reading has not been checked by a lawyer, and when it was written. */}
        <Text style={{ fontSize: text.sm, color: t.inkSlate2, lineHeight: 22, marginBottom: 6 }}>
          {DRAFT.body}
        </Text>
        <Text style={{ fontSize: 12, color: t.ink4, marginBottom: spacing[4] }}>{DRAFT.asOf}</Text>
        <LegalSections sections={TERMS_CONTENT} />
      </Card>
    </Screen>
  );
}
