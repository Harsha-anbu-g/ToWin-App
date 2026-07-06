// Avatar with initials fallback on the neutral grey bed (web: --avatar-grey).
import { Image, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function initialsOf(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, uri, size = 44, style }) {
  const { t } = useTheme();
  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.avatarGrey,
    overflow: 'hidden',
  };
  return (
    <View accessibilityLabel={name} style={[base, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} accessibilityLabel={name} />
      ) : (
        <Text
          style={{
            color: t.inkSlate,
            fontSize: Math.max(13, size * 0.38),
            fontWeight: '600',
          }}
        >
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
