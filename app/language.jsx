// Language — English, Français or தமிழ். Reached from Profile → Language.
// The choice applies at once, everywhere, and is remembered on this phone.
import { Text } from 'react-native';
import LanguagePicker from '../src/components/LanguagePicker';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { tr } from '../src/i18n';
import { useTheme } from '../src/theme/ThemeContext';

export default function LanguageScreen() {
  const { t, spacing, type } = useTheme();
  return (
    <Screen title={tr('Language')} back>
      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[3] }}>
        {tr('Choose the language Towinly speaks to you in. It changes straight away.')}
      </Text>
      <Card style={{ marginTop: spacing[4] }} contentStyle={{ paddingVertical: 2 }}>
        <LanguagePicker />
      </Card>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[4] }}>
        {tr('Messages, names and anything people write stay in the words they were written in.')}
      </Text>
    </Screen>
  );
}
