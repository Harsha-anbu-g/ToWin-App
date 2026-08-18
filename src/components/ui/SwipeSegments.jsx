// Swipe between segments (owner call 2026-08-17: iOS feel — swiping the
// content changes the tab, like flicking between pages). Wraps a segmented
// screen's content; a decisive horizontal drag steps the SegmentedControl
// value, while vertical scrolls and row taps pass through untouched.
//
// PanResponder, not a pager: the lists underneath are FlatLists/ScrollViews
// with their own virtualization, so the content never moves — the gesture is
// only a command. The responder claims the touch ONLY when the drag is
// clearly horizontal (2:1 over vertical) and past a real distance, so it
// never steals a scroll or a tap.
import { useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { haptic } from '../../lib/haptics';

const CLAIM_DISTANCE = 24; // px of horizontal travel before we even consider it
const COMMIT_DISTANCE = 48; // px of travel that counts as a real swipe

export default function SwipeSegments({ keys, value, onChange, children, style }) {
  // The responder is created once; reads live through a ref so the closure
  // never goes stale between renders.
  const live = useRef({ keys, value, onChange });
  live.current = { keys, value, onChange };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > CLAIM_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < COMMIT_DISTANCE) return;
        const { keys: k, value: v, onChange: change } = live.current;
        const i = k.indexOf(v);
        const next = g.dx < 0 ? i + 1 : i - 1; // swipe left → next segment
        if (next < 0 || next >= k.length) return;
        haptic.selection(); // same tick the SegmentedControl gives a tap (§11)
        change(k[next]);
      },
    })
  ).current;

  return (
    <View style={style} {...pan.panHandlers}>
      {children}
    </View>
  );
}
