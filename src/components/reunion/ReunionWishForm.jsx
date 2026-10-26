// Step 1, the wish: who the elder wants to see again, in their own words.
// Four fields, one button. The names field is where the finding starts.
import { useState } from 'react';
import { View } from 'react-native';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../i18n';

export default function ReunionWishForm({ onSubmit, submitting }) {
  const { spacing } = useTheme();
  const [institution, setInstitution] = useState('');
  const [years, setYears] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const submit = () => {
    if (!institution.trim()) {
      setError(tr('Say which batch, class or office it was.'));
      return;
    }
    setError(null);
    onSubmit({ institution: institution.trim(), years: years.trim(), city: city.trim(), note: note.trim() });
  };

  return (
    <Card>
      <View style={{ gap: spacing[3] }}>
        <Input
          label={tr('Who do you want to see again?')}
          value={institution}
          onChangeText={(v) => {
            setInstitution(v);
            if (error) setError(null);
          }}
          error={error}
          helper={tr('For example: B.Sc. batch, Presidency College')}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <Input label={tr('Which years?')} value={years} onChangeText={setYears} helper={tr('1968 to 1971')} />
        <Input label={tr('Which city?')} value={city} onChangeText={setCity} autoCapitalize="words" />
        <Input
          label={tr('Names you remember')}
          value={note}
          onChangeText={setNote}
          helper={tr('Anything that helps find them. A cousin who has a number, a street, a nickname.')}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 96, textAlignVertical: 'top' }}
        />
        <Button title={tr('Make the wish')} onPress={submit} loading={submitting} />
      </View>
    </Card>
  );
}
