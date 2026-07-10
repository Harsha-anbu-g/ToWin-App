// Peekaboo — the calm memory game (port of PeekabooGame.jsx logic: 6 pairs,
// 60 seconds, misses flip back after 1.2s). Tiles are big and touch-friendly;
// no flashy motion — state changes resolve instantly (reduced-motion safe).
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Turtle } from 'lucide-react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { initCards, resolvePair, won, PAIRS, TIME } from '../src/lib/peekaboo';
import { useTheme } from '../src/theme/ThemeContext';

export default function GameScreen() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const [cards, setCards] = useState(initCards);
  const [selected, setSelected] = useState([]);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [phase, setPhase] = useState('playing'); // playing | won | lost

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('lost');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  useEffect(() => {
    if (phase === 'playing' && won(cards)) setPhase('won');
  }, [cards, phase]);

  const flip = (idx) => {
    if (locked || phase !== 'playing') return;
    const card = cards[idx];
    if (card.flipped || card.matched || selected.length >= 2) return;
    const next = [...selected, idx];
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: true } : c)));
    setSelected(next);
    if (next.length === 2) {
      setLocked(true);
      const [a, b] = next;
      setTimeout(() => {
        setCards((prev) => resolvePair(prev, a, b));
        setSelected([]);
        setLocked(false);
      }, 1200);
    }
  };

  const restart = () => {
    setCards(initCards());
    setSelected([]);
    setLocked(false);
    setTimeLeft(TIME);
    setPhase('playing');
  };

  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const timerColor = timeLeft <= 15 ? t.redError : timeLeft <= 30 ? t.starGold : t.greenDeep;

  return (
    <Screen title="Peekaboo">
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: text.base, color: t.inkSlate }}>
            Match all {PAIRS} pairs to win
          </Text>
          <Text
            accessibilityLabel={`${timeLeft} seconds left`}
            style={{ fontSize: text.lg, fontWeight: '600', color: timerColor, fontVariant: ['tabular-nums'] }}
          >
            {timeLeft}s
          </Text>
        </View>
        <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
          {matchedCount} of {PAIRS} pairs found
        </Text>

        {/* 3×4 grid of tiles */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4] }}>
          {cards.map((card, idx) => {
            const showing = card.flipped || card.matched;
            return (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={
                  card.matched ? `Matched ${card.num}` : showing ? `Showing ${card.num}` : 'Hidden tile'
                }
                accessibilityState={{ disabled: card.matched || phase !== 'playing' }}
                onPress={() => flip(idx)}
                style={{
                  width: '31%',
                  aspectRatio: 1,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: card.matched ? t.greenTint : showing ? t.blueTint : t.surface2,
                  borderWidth: 1.5,
                  borderColor: card.matched ? t.greenLine : showing ? t.blueSoft : t.border,
                }}
              >
                {showing ? (
                  <Text
                    style={{
                      fontSize: 30,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                      color: card.matched ? t.greenDeep : t.blueDeep,
                    }}
                  >
                    {card.num}
                  </Text>
                ) : (
                  <Turtle size={26} color={t.idleGrey} />
                )}
              </Pressable>
            );
          })}
        </View>

        {phase !== 'playing' ? (
          <View
            style={{
              backgroundColor: phase === 'won' ? t.greenTint : t.redTint,
              borderRadius: radius.md,
              padding: spacing[4],
              marginTop: spacing[5],
            }}
          >
            <Text
              accessibilityRole="alert"
              style={{
                fontSize: text.base,
                lineHeight: 26,
                color: phase === 'won' ? t.greenDeep : t.redError,
                textAlign: 'center',
              }}
            >
              {phase === 'won'
                ? 'You found them all — slow and steady wins!'
                : "Time's up — no rush, try again whenever you like."}
            </Text>
            <Button title="Play again" variant="primary" onPress={restart} style={{ marginTop: spacing[4] }} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
