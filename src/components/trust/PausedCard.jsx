// On-a-break card (HCI rule 3): a paused friendship stays visible with one
// obvious way back — Resume. Pausing freezes trust steps AND messages
// (backend rule: the whole connection is PAUSED), so the copy says exactly that.
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

export default function PausedCard({ conn, onResume, resuming }) {
  const { t, radius, type, fontFamily } = useTheme();
  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: t.ink }}>{conn.otherUserName}</Text>
          <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1, lineHeight: 18 }}>
            On a break. Trust steps and messages are paused.
          </Text>
        </View>
      </View>
      <Button title="Resume" variant="secondary" loading={resuming} onPress={onResume} style={{ marginTop: 14 }} />
    </View>
  );
}
