// Avatar with initials fallback on the neutral grey bed (web: --avatar-grey).
// expo-image (not RN core Image): disk-caches remote photos so avatars don't
// re-download and pop in on every screen visit — kind to limited data plans.
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
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
    // `accessible` groups the avatar into one element announced by the person's
    // name — otherwise the initials fallback is read out letter by letter ("J D").
    <View accessible accessibilityLabel={name} accessibilityRole="image" style={[base, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
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
