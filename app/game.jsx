// Peekaboo (3j) — the calm memory game ON the tortoise's shell: 12 hex cells
// (3×4) in the canvas artwork, a 60s timer ring, and a sky progress bar.
// Logic is the same pure module (6 pairs, misses flip back after 1.2s);
// state changes resolve instantly (reduced-motion safe). The tortoise is an
// illustration — its colors stay literal in night mode, like the brand mark.
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import Button from '../src/components/ui/Button';
import Screen from '../src/components/ui/Screen';
import { initCards, resolvePair, won, PAIRS, TIME } from '../src/lib/peekaboo';
import {
  PEEKABOO_BODY,
  PEEKABOO_CELL_FLIPPED,
  PEEKABOO_EYE,
  PEEKABOO_MATCHED,
  PEEKABOO_SHELL,
  PEEKABOO_WHITE,
} from '../src/theme/parity';
import { useTheme } from '../src/theme/ThemeContext';

// Canvas 3j geometry: hexagon centers, 3 columns × 4 rows on the shell.
const CELL_COLS = [118, 190, 262];
const CELL_ROWS = [96, 158, 220, 282];
const hexPoints = (cx, cy) =>
  `${cx + 33},${cy} ${cx + 16.5},${cy + 28.6} ${cx - 16.5},${cy + 28.6} ${cx - 33},${cy} ${cx - 16.5},${cy - 28.6} ${cx + 16.5},${cy - 28.6}`;

const RING_C = 2 * Math.PI * 26; // timer circle circumference (r=26)

function TimerRing({ timeLeft }) {
  const { t } = useTheme();
  return (
    <View style={{ width: 64, height: 64 }}>
      <Svg width={64} height={64}>
        <G rotation="-90" origin="32,32">
          <Circle cx={32} cy={32} r={26} fill="none" stroke={t.border} strokeWidth={6} />
          <Circle
            cx={32}
            cy={32}
            r={26}
            fill="none"
            stroke={PEEKABOO_BODY}
            strokeWidth={6}
            strokeDasharray={`${RING_C}`}
            strokeDashoffset={RING_C * (1 - timeLeft / TIME)}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          accessibilityLabel={`${timeLeft} seconds left`}
          style={{ fontSize: 17, fontWeight: '600', color: PEEKABOO_BODY, lineHeight: 18, fontVariant: ['tabular-nums'] }}
        >
          {timeLeft}
        </Text>
        <Text style={{ fontSize: 9, color: t.inkFaint2 }}>SEC</Text>
      </View>
    </View>
  );
}

// The full canvas tortoise with the 12 tappable shell cells. memo'd: the 1s
// countdown tick re-renders GameScreen every second, and this ~45-node SVG
// must not repaint with it — only when a card actually flips.
const TortoiseBoard = memo(function TortoiseBoard({ cards, onFlip, disabled }) {
  const { width } = useWindowDimensions();
  const boardW = Math.min(width - 32, 360);

  return (
    <Svg
      width={boardW}
      height={boardW * (470 / 360)}
      viewBox="10 -32 360 470"
      accessibilityLabel="Tortoise shell game board"
    >
      <Ellipse cx={190} cy={416} rx={118} ry={10} fill={PEEKABOO_BODY} opacity={0.07} />
      {/* legs + tail */}
      <Path d="M 112 84 C 66 72, 30 48, 40 18 C 74 10, 112 38, 126 72 Z" fill={PEEKABOO_BODY} />
      <Path d="M 268 84 C 314 72, 350 48, 340 18 C 306 10, 268 38, 254 72 Z" fill={PEEKABOO_BODY} />
      <Path d="M 112 294 C 64 308, 30 334, 42 362 C 76 370, 114 340, 126 306 Z" fill={PEEKABOO_BODY} />
      <Path d="M 268 294 C 316 308, 350 334, 338 362 C 304 370, 266 340, 254 306 Z" fill={PEEKABOO_BODY} />
      <Path d="M 174 348 C 178 378, 202 378, 206 348 C 196 356, 184 356, 174 348 Z" fill={PEEKABOO_BODY} />
      {/* head, peeking over the shell */}
      <Ellipse cx={190} cy={40} rx={18} ry={28} fill={PEEKABOO_BODY} />
      <Circle cx={190} cy={8} r={30} fill={PEEKABOO_BODY} />
      <Circle cx={178} cy={2} r={5.5} fill={PEEKABOO_CELL_FLIPPED} />
      <Circle cx={202} cy={2} r={5.5} fill={PEEKABOO_CELL_FLIPPED} />
      <Circle cx={178.5} cy={2.5} r={2.6} fill={PEEKABOO_EYE} />
      <Circle cx={201.5} cy={2.5} r={2.6} fill={PEEKABOO_EYE} />
      {/* body + shell */}
      <Ellipse cx={190} cy={189} rx={152} ry={174} fill={PEEKABOO_BODY} />
      <Ellipse cx={190} cy={189} rx={138} ry={160} fill={PEEKABOO_SHELL} />
      <Ellipse cx={190} cy={189} rx={130} ry={152} fill="none" stroke={PEEKABOO_WHITE} strokeWidth={1.5} opacity={0.14} />
      <Ellipse cx={150} cy={110} rx={58} ry={72} fill={PEEKABOO_WHITE} opacity={0.05} />
      {/* the 12 cells, row-major */}
      {cards.map((card, idx) => {
        const cx = CELL_COLS[idx % 3];
        const cy = CELL_ROWS[Math.floor(idx / 3)];
        const showing = card.flipped || card.matched;
        const fill = card.matched ? PEEKABOO_MATCHED : showing ? PEEKABOO_CELL_FLIPPED : PEEKABOO_BODY;
        return (
          <G key={card.id}>
            <Polygon
              points={hexPoints(cx, cy)}
              fill={fill}
              stroke={PEEKABOO_SHELL}
              strokeWidth={2.5}
              onPress={disabled || card.matched || showing ? undefined : () => onFlip(idx)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                card.matched ? `Matched ${card.num}` : showing ? `Showing ${card.num}` : 'Hidden cell'
              }
            />
            {card.matched ? (
              <Path
                d={`M ${cx - 12} ${cy} l 8 8 l 16 -16`}
                stroke={PEEKABOO_WHITE}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : showing ? (
              <SvgText
                x={cx}
                y={cy + 9}
                fontSize={26}
                fontWeight="600"
                fill={PEEKABOO_BODY}
                textAnchor="middle"
              >
                {String(card.num)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
});

export default function GameScreen() {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const router = useRouter();
  const [cards, setCards] = useState(initCards);
  const [selected, setSelected] = useState([]);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [phase, setPhase] = useState('playing'); // playing | won | lost
  // WCAG 2.2.1 Timing Adjustable: elders with slower reactions must be able
  // to stop the clock — losing purely to the timer is the opposite of calm.
  const [paused, setPaused] = useState(false);
  // The 1.2s flip-back timer must not outlive the screen (or a restart) — a
  // dangling timer would setState after unmount / corrupt a fresh board.
  const flipBackTimer = useRef(null);
  useEffect(() => () => clearTimeout(flipBackTimer.current), []);

  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    if (timeLeft <= 0) {
      setPhase('lost');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase, paused]);

  useEffect(() => {
    if (phase === 'playing' && won(cards)) setPhase('won');
  }, [cards, phase]);

  // Stable across timer ticks so the memo'd board skips the 1s re-render.
  const flip = useCallback((idx) => {
    if (locked || phase !== 'playing' || paused) return;
    const card = cards[idx];
    if (card.flipped || card.matched || selected.length >= 2) return;
    const next = [...selected, idx];
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: true } : c)));
    setSelected(next);
    if (next.length === 2) {
      setLocked(true);
      const [a, b] = next;
      flipBackTimer.current = setTimeout(() => {
        setCards((prev) => resolvePair(prev, a, b));
        setSelected([]);
        setLocked(false);
      }, 1200);
    }
  }, [locked, phase, paused, cards, selected]);

  const restart = () => {
    clearTimeout(flipBackTimer.current);
    setCards(initCards());
    setSelected([]);
    setLocked(false);
    setTimeLeft(TIME);
    setPaused(false);
    setPhase('playing');
  };

  const toDashboard = () => router.replace('/(tabs)/dashboard');
  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return (
    <Screen back scroll contentStyle={{ paddingTop: 4 }}>
      {/* Header: green serif title + the 60s ring */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: 30, color: PEEKABOO_BODY, letterSpacing: -0.5 }}
          >
            Peekaboo!
          </Text>
          <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 5 }}>
            Match all {PAIRS} pairs to win
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {phase === 'playing' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume the game' : 'Pause the game'}
              onPress={() => setPaused((p) => !p)}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}>
                {paused ? 'Resume' : 'Pause'}
              </Text>
            </Pressable>
          ) : null}
          <TimerRing timeLeft={timeLeft} />
        </View>
      </View>

      {/* Sky progress bar + n/6 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1, height: 8, backgroundColor: t.border, borderRadius: radius.pill, overflow: 'hidden' }}>
          <View
            style={{
              width: `${(matchedCount / PAIRS) * 100}%`,
              height: '100%',
              backgroundColor: t.blue,
              borderRadius: radius.pill,
            }}
          />
        </View>
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep, fontVariant: ['tabular-nums'] }}>
          {matchedCount}/{PAIRS}
        </Text>
      </View>

      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 21, marginTop: 12 }}>
        {paused
          ? 'Paused — take all the time you need. Tap Resume when ready.'
          : 'Tap two cells on the shell. A pair that matches stays open — slow and steady.'}
      </Text>

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <TortoiseBoard cards={cards} onFlip={flip} disabled={locked || phase !== 'playing'} />
      </View>

      {phase !== 'playing' ? (
        <View
          style={{
            backgroundColor: phase === 'won' ? t.greenTint : t.redTint,
            borderRadius: radius.input,
            padding: spacing[4],
            marginTop: spacing[4],
          }}
        >
          <Text
            accessibilityRole="alert"
            style={{
              fontSize: type.body,
              lineHeight: 22,
              color: phase === 'won' ? t.greenDeep : t.redError,
              textAlign: 'center',
            }}
          >
            {phase === 'won'
              ? 'You found them all — slow and steady wins!'
              : "Time's up — no rush, try again whenever you like."}
          </Text>
          <Button title="Continue to Dashboard" variant="primary" onPress={toDashboard} style={{ marginTop: spacing[4] }} />
          <Button title="Play again" variant="secondary" onPress={restart} style={{ marginTop: spacing[2] }} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Skip to Dashboard"
          onPress={toDashboard}
          hitSlop={{ top: 8, bottom: 8 }}
          style={{ alignSelf: 'center', paddingVertical: 10 }}
        >
          <Text style={{ fontSize: type.meta, color: t.inkSlate, textDecorationLine: 'underline' }}>
            Skip to Dashboard
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}
