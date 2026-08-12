// Pull-to-refresh in Towinly colours (UX-704). tintColor paints iOS only;
// Android reads `colors` and would fall back to default gray without it, so
// both are set here, with the spinner puck on the plain page surface. The
// colour props sit after the spread so a call site cannot drift the look —
// screens wire only refreshing/onRefresh.
//
// The browser gets a button instead of the gesture (DEEP-07). react-native-web
// destructures onRefresh and refreshing and throws both away, then renders a
// plain View (its exports/RefreshControl/index.js), so the pull an elder makes
// on towinly.com/app/ has never done anything: no spinner, no fetch, no way to
// tell. A gesture that lies is worse than no gesture, and the pull cannot be
// rebuilt on top of a scroller that never reports momentum — so the web build
// says the same thing in words, which is the affordance elders read first
// anyway. Both ScrollView implementations hand the refresh control the
// scroller as its children (RNW clones it around the list; RN does the same on
// Android), which is why the web branch renders `children` and the native
// branch keeps forwarding every prop untouched.
import { Platform, RefreshControl as NativeRefreshControl, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import TextLink from './TextLink';

export default function RefreshControl(props) {
  const { t } = useTheme();

  if (Platform.OS === 'web') {
    const { refreshing, onRefresh, style, children } = props;
    return (
      <View style={style}>
        <TextLink
          label={refreshing ? 'Refreshing…' : 'Refresh'}
          disabled={refreshing}
          onPress={onRefresh}
        />
        {children}
      </View>
    );
  }

  return (
    <NativeRefreshControl
      {...props}
      tintColor={t.blue}
      colors={[t.blue]}
      progressBackgroundColor={t.surface}
    />
  );
}
