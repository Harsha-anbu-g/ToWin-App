// Pull-to-refresh in Towinly colours (UX-704). tintColor paints iOS only;
// Android reads `colors` and would fall back to default gray without it, so
// both are set here, with the spinner puck on the plain page surface. The
// colour props sit after the spread so a call site cannot drift the look —
// screens wire only refreshing/onRefresh.
//
// The browser. react-native-web destructures onRefresh and refreshing and
// throws both away, then renders a plain View (its exports/RefreshControl/
// index.js), so the pull an elder makes on towinly.com/app/ never did
// anything (DEEP-07). A phone browser now gets the gesture back (owner call
// 2026-09-04: the phone web build looks like the iOS app), built on the touch
// events this wrapper receives: a drag that starts with the list at its very
// top pulls a spinner into view, and letting go past PULL_THRESHOLD runs the
// same reload the phone's pull runs. A browser with nothing to pull with (a
// laptop) keeps the visible Refresh link, the DEEP-07 control. Both ScrollView
// implementations hand the refresh control the scroller as its children (RNW
// clones it around the list; RN does the same on Android), which is why the
// web branches render `children` and the native branch keeps forwarding every
// prop untouched.
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl as NativeRefreshControl,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import TextLink from './TextLink';
import { tr } from '../../i18n';

/** How far the finger travels down before letting go reloads. */
export const PULL_THRESHOLD = 72;
/** The spinner band's height while a reload runs — the list sits below it. */
const BAND_HEIGHT = 48;

/** A screen that can be pulled: any touch point at all. */
export const hasTouchScreen = () =>
  (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
  (typeof window !== 'undefined' && 'ontouchstart' in window);

const touchY = (e) => e.nativeEvent?.touches?.[0]?.clientY ?? e.touches?.[0]?.clientY ?? 0;

function WebPull({ refreshing, onRefresh, style, children }) {
  const { t } = useTheme();
  const host = useRef(null);
  // Where the drag began, or null when this drag cannot pull (list not at top).
  const startY = useRef(null);
  const [pull, setPull] = useState(0);

  // The scroller is the last child: RNW clones this control around it.
  const listAtTop = () => (host.current?.lastElementChild?.scrollTop ?? 0) <= 0;

  const onTouchStart = (e) => {
    startY.current = !refreshing && listAtTop() ? touchY(e) : null;
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    setPull(Math.max(0, touchY(e) - startY.current));
  };
  const onTouchEnd = () => {
    if (startY.current != null && pull >= PULL_THRESHOLD && !refreshing) onRefresh?.();
    startY.current = null;
    setPull(0);
  };

  return (
    <View
      ref={host}
      style={style}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {refreshing ? (
        <View
          testID="web-pull-band"
          accessible
          accessibilityLabel={tr('Refreshing')}
          style={{ height: BAND_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator color={t.blue} />
        </View>
      ) : pull > 0 ? (
        // Fades in with the pull; before the scroller in the tree, above it
        // on screen. Layout stays put, so the list never jumps under the finger.
        <View
          testID="web-pull-hint"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            zIndex: 1,
            alignItems: 'center',
            opacity: Math.min(pull / PULL_THRESHOLD, 1),
          }}
        >
          <ActivityIndicator color={t.blue} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

export default function RefreshControl(props) {
  const { t } = useTheme();

  if (Platform.OS === 'web') {
    if (hasTouchScreen()) return <WebPull {...props} />;
    const { refreshing, onRefresh, style, children } = props;
    return (
      <View style={style}>
        <TextLink
          label={refreshing ? tr('Refreshing…') : tr('Refresh')}
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
