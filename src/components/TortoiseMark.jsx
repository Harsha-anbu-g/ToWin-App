// The ToWin tortoise, as vector geometry — port of the web's TortoiseMark +
// IntroBrandLockup (ToWin/frontend/src/components/TortoiseMark.jsx and the
// intro-draw beats in index.css). The mark draws itself in: shell first, the
// head rises, legs arrive in pairs, the seven shell cells pop, then the mark
// slides left as "ToWin" wipes in and pushes it aside.
//
// Web timing, kept verbatim (a logo animating itself in is a brand beat, not a
// UI response — the deliberate exception to the <300ms rule, same as the web):
//   0.0–1.2s shell · 1.2–1.5s head · 1.5–2.0s legs · 2.0–2.6s cells (70ms
//   stagger) · 2.65s recenter + wordmark wipe (460ms).
// Reduced-motion users get the finished lockup, static — same as the web.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { TORTOISE_CELL_GREEN } from '../theme/parity';
import { CELLS, DRAW, STROKE, VIEWBOX } from './tortoiseMarkPaths';

const APath = Animated.createAnimatedComponent(Path);

// Curves from the web's motion standards: DRAW beats use a strong ease-in-out
// (a pen accelerating then settling); everything that ARRIVES uses ease-out.
const EASE_DRAW = Easing.bezier(0.77, 0, 0.175, 1);
const EASE_ARRIVE = Easing.bezier(0.23, 1, 0.32, 1);

// [delay, duration, easing] per drawn part — verbatim from index.css.
const BEATS = {
  shell: [0, 1200, EASE_DRAW],
  'head-l': [1200, 300, EASE_DRAW],
  'head-r': [1200, 300, EASE_DRAW],
  'leg-tl': [1500, 300, EASE_ARRIVE],
  'leg-tr': [1500, 300, EASE_ARRIVE],
  'leg-bl': [1650, 300, EASE_ARRIVE],
  'leg-br': [1650, 300, EASE_ARRIVE],
};
const CELL_DELAY = 2000; // then +70ms per cell (30–80ms stagger window)
const CELL_STAGGER = 70;
const CELL_DURATION = 200;
const RECENTER_DELAY = 2650;
const RECENTER_DURATION = 460;

function DrawPath({ d, length, beat, running, mitre }) {
  // Primed hidden (full dash offset); the beat draws it to 0.
  const offset = useSharedValue(length);
  useEffect(() => {
    if (!running) return;
    const [delay, duration, easing] = beat;
    offset.value = withDelay(delay, withTiming(0, { duration, easing }));
  }, [running, beat, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <APath
      d={d}
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
      // the heart's cleft and bottom point are mitred in the artwork; a round
      // join can't reach them
      {...(mitre ? { strokeLinejoin: 'miter', strokeMiterlimit: 4 } : null)}
    />
  );
}

function CellPath({ d, cx, cy, index, running }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!running) return;
    p.value = withDelay(
      CELL_DELAY + index * CELL_STAGGER,
      withTiming(1, { duration: CELL_DURATION, easing: EASE_ARRIVE })
    );
  }, [running, index, p]);
  // never scale(0) — nothing appears from nothing (web rule: 0.9 → 1)
  const animatedProps = useAnimatedProps(() => ({
    opacity: p.value,
    scale: 0.9 + 0.1 * p.value,
  }));
  return <APath d={d} origin={`${cx}, ${cy}`} animatedProps={animatedProps} />;
}

export default function TortoiseMark({ size = 82, intro = false, running = false, title }) {
  const { t } = useTheme();
  const stroke = {
    fill: 'none',
    stroke: t.logoGreen,
    strokeWidth: STROKE,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  return (
    <Svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      accessible={!!title}
      accessibilityRole="image"
      accessibilityLabel={title}
    >
      <G {...stroke}>
        {DRAW.map(([id, length, d]) =>
          intro ? (
            <DrawPath
              key={id}
              d={d}
              length={length}
              beat={BEATS[id]}
              running={running}
              mitre={id === 'shell'}
            />
          ) : (
            <Path
              key={id}
              d={d}
              {...(id === 'shell' ? { strokeLinejoin: 'miter', strokeMiterlimit: 4 } : null)}
            />
          )
        )}
        {/* Shell cells sit a shade lighter than the outline (artwork parity) */}
        <G stroke={TORTOISE_CELL_GREEN}>
          {CELLS.map(([id, cx, cy, d], i) =>
            intro ? (
              <CellPath key={id} d={d} cx={cx} cy={cy} index={i} running={running} />
            ) : (
              <Path key={id} d={d} />
            )
          )}
        </G>
      </G>
    </Svg>
  );
}

/**
 * The mark and the "ToWin" wordmark as one unit, playing the intro on every
 * mount (no once-per-session gate — the web plays it on every landing view).
 * While it draws, the tortoise sits centred over the whole lockup; when
 * "ToWin" arrives it slides back left into place, so the wordmark reads as
 * pushing it aside. The slide distance is half of (gap + wordmark width) —
 * measured, so it stays exact at any rendered text width.
 */
export function IntroBrandLockup({ size = 82, gap = 6, wordStyle }) {
  const { t } = useTheme();
  const reducedMotion = useReducedMotion();
  const [wordWidth, setWordWidth] = useState(0);
  const [running, setRunning] = useState(false);
  const play = !reducedMotion;

  const shift = wordWidth ? (gap + wordWidth) / 2 : 0;
  const markX = useSharedValue(0);
  const wordX = useSharedValue(0);

  // Hold the primed state until the wordmark is measured (one frame), then
  // fire the beats — the mobile equivalent of the web's held first paint.
  useEffect(() => {
    if (!play || !wordWidth || running) return;
    markX.value = shift;
    wordX.value = -(wordWidth + 2); // web: translateX(-101%)
    markX.value = withDelay(
      RECENTER_DELAY,
      withTiming(0, { duration: RECENTER_DURATION, easing: EASE_ARRIVE })
    );
    wordX.value = withDelay(
      RECENTER_DELAY,
      withTiming(0, { duration: RECENTER_DURATION, easing: EASE_ARRIVE })
    );
    setRunning(true);
  }, [play, wordWidth, running, shift, markX, wordX]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateX: markX.value }] }));
  const wordInnerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: wordX.value }] }));

  const word = {
    fontSize: 36,
    fontWeight: '600',
    color: t.ink,
    letterSpacing: -0.8,
    ...wordStyle,
  };

  if (!play) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
        <TortoiseMark size={size} title="ToWin tortoise logo" />
        <Text style={word}>ToWin</Text>
      </View>
    );
  }

  return (
    // invisible until measured so the primed offsets never flash unshifted
    <View style={{ flexDirection: 'row', alignItems: 'center', gap, opacity: running ? 1 : 0 }}>
      <Animated.View style={markStyle}>
        <TortoiseMark size={size} intro running={running} title="ToWin tortoise logo" />
      </Animated.View>
      {/* the wipe: overflow hidden + a translated inner (transform, GPU) */}
      <View style={{ overflow: 'hidden' }}>
        <Animated.Text
          style={[word, wordInnerStyle]}
          onLayout={(e) => setWordWidth(e.nativeEvent.layout.width)}
        >
          ToWin
        </Animated.Text>
      </View>
    </View>
  );
}
