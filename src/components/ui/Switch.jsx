// The platform's own switch, sized like the iPhone's in the browser.
//
// On iOS and Android this is React Native's Switch untouched (native controls
// first). react-native-web draws its own 40×20 control with a teal knob when
// on, so a phone opening towinly.com/app got a different switch from the one
// on every other screen of the app (owner call 2026-09-04: the phone web build
// looks like the iOS app). Sized to Apple's proportions — RNW keeps the width
// at twice the height, so 56×28 is the closest it gets to 51×31 — with a
// white knob in both states; track colours stay whatever the caller sets.
import { Platform, Switch as NativeSwitch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const WEB_SWITCH_SIZE = { width: 56, height: 28 };

export default function Switch(props) {
  // actionInk: the white that sits on the blue action fill in both themes —
  // the knob rides the same blue track.
  const { t } = useTheme();
  if (Platform.OS !== 'web') return <NativeSwitch {...props} />;
  return (
    <NativeSwitch
      thumbColor={t.actionInk}
      activeThumbColor={t.actionInk}
      {...props}
      style={[WEB_SWITCH_SIZE, props.style]}
    />
  );
}
