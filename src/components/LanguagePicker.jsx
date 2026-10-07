// Choosing the app's language. Each language is written in its own words, so
// somebody who cannot read the current one can still find theirs.
//
// variant="list"   — full rows with a tick, for the Language screen
// variant="inline" — one quiet row of three, for the welcome and login screens,
//                    where a person may need their language before anything else
import { Pressable, Text, View } from 'react-native';
import { Check, Globe } from './icons';
import { LANGUAGES, setLanguage, tr, useLanguage } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

export default function LanguagePicker({ variant = 'list', style }) {
  const { t, spacing, type } = useTheme();
  const lang = useLanguage();

  if (variant === 'inline') {
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={tr('Language')}
        style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: spacing[2] }, style]}
      >
        <Globe size={16} color={t.inkSlate} strokeWidth={1.8} />
        {LANGUAGES.map(({ code, label }) => {
          const on = code === lang;
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={label}
              onPress={() => setLanguage(code)}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: spacing[3],
                justifyContent: 'center',
                borderRadius: 22,
                backgroundColor: on ? t.surfaceFill : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: type.meta, fontWeight: on ? '600' : '400', color: on ? t.ink : t.inkSlate }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={tr('Language')} style={style}>
      {LANGUAGES.map(({ code, label }, i) => {
        const on = code === lang;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            aria-checked={on}
            accessibilityLabel={label}
            onPress={() => setLanguage(code)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 56,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.hairline,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ flex: 1, fontSize: 18, fontWeight: on ? '600' : '400', color: t.ink }}>{label}</Text>
            {on ? <Check size={22} color={t.blueDeep} strokeWidth={2.2} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
