// First-visit explainer (HCI rule 10): a dismissible plain-words card that
// shows once per concept, then never again (one SecureStore flag each —
// same pattern as the daily check-in gate).
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';

export default function FirstTimeCard({ flag, title, body, linkTitle, onLink, style }) {
  const { t, radius, type } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(flag).then((seen) => {
      if (alive && !seen) setShow(true);
    });
    return () => {
      alive = false;
    };
  }, [flag]);

  const dismiss = () => {
    setShow(false);
    SecureStore.setItemAsync(flag, '1');
    AccessibilityInfo.announceForAccessibility('Got it — this note will not show again.');
  };

  if (!show) return null;
  return (
    <View
      style={[
        { backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16 },
        style,
      ]}
    >
      <Text accessibilityRole="header" style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
        {title}
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 6 }}>{body}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {onLink ? <Button title={linkTitle} variant="text" size="small" onPress={onLink} /> : null}
        <Button title="Got it" variant="secondary" size="small" onPress={dismiss} />
      </View>
    </View>
  );
}
