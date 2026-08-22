// Avatar with initials fallback on the neutral grey bed (web: --avatar-grey).
// expo-image (not RN core Image): disk-caches remote photos so avatars don't
// re-download and pop in on every screen visit — kind to limited data plans.
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// A default parameter fires on undefined and NOT on null, and the API really
// does send `"name": null` (backend registration never sets fullName, the
// column is nullable, ProfileResponse has no NON_NULL include). The old
// `name = ''` default therefore let null through to .trim(), which threw a
// TypeError mid-render and, with no boundary above it, blanked the whole app.
// Coerce here rather than at the 12+ call sites: one door, one guard.
// Non-text (objects, arrays, booleans) yields no initials rather than
// "[object Object]" initials.
const asText = (name) =>
  typeof name === 'string' || typeof name === 'number' ? String(name) : '';

function initialsOf(name) {
  return asText(name)
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, uri, size = 44, style }) {
  const { t, fontScaleCaps } = useTheme();
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
    <View
      accessible
      // Same coercion: a non-string accessibilityLabel is a native type error,
      // and an empty label is dropped so the group is not announced as blank.
      accessibilityLabel={asText(name).trim() || undefined}
      accessibilityRole="image"
      style={[base, style]}
    >
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
          maxFontSizeMultiplier={fontScaleCaps.chrome}
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
