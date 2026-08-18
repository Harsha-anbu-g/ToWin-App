// Segmented control — the canvas's pill track (3d/3f/3g/4a…): surfaceFill
// track, label + tabular count.
//
// iOS lens (owner call 2026-08-17, "like WhatsApp / the Apple one"): ONE
// glass pill slides between segments instead of each chip painting its own
// active fill — blur underneath, a translucent segActive wash on top, and a
// bright hairline rim, gliding with the app's base ease-out beat. Reduced
// motion snaps it in place; until the first layout measures the track the
// lens simply doesn't render (Jest never lays out, so tests see plain chips
// with the same roles and states as always).
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { haptic } from '../../lib/haptics';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';

const TRACK_PAD = 4; // the track's horizontal inset the lens must respect
const LENS_INSET = 5; // top/bottom air inside the 40pt slot

export default function SegmentedControl({ segments, value, onChange, style }) {
  const { t, mode, radius, type, fontScaleCaps, pressRipple } = useTheme();
  const reducedMotion = useReducedMotion();
  const [trackW, setTrackW] = useState(0);

  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const slotW = trackW > 0 ? (trackW - TRACK_PAD * 2) / segments.length : 0;
  const slide = useRef(new Animated.Value(0)).current;
  const placed = useRef(false); // first layout positions without animating

  useEffect(() => {
    if (slotW <= 0) return;
    const dest = TRACK_PAD + index * slotW;
    if (reducedMotion || !placed.current) {
      placed.current = true;
      slide.setValue(dest);
      return;
    }
    // Same spring voice as the tab bar's lens: quick, critically damped —
    // the WhatsApp glide, no visible bounce (Emil rule still holds).
    Animated.spring(slide, {
      toValue: dest,
      damping: 26,
      stiffness: 320,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [index, slotW, reducedMotion, slide]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: t.surfaceFill,
          borderRadius: radius.pill,
          paddingHorizontal: TRACK_PAD,
        },
        style,
      ]}
    >
      {slotW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: LENS_INSET,
            bottom: LENS_INSET,
            left: 0,
            width: slotW,
            borderRadius: radius.pill,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: mode === 'dark' ? t.border : 'rgba(255,255,255,0.9)',
            transform: [{ translateX: slide }],
          }}
        >
          {/* Android's blur is costly and uneven — the wash alone reads fine there. */}
          {Platform.OS !== 'android' ? (
            <BlurView
              intensity={18}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : null}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: t.segActive,
              opacity: Platform.OS === 'android' ? 0.92 : 0.72,
            }}
          />
        </Animated.View>
      ) : null}
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            accessibilityRole="tab"
            accessibilityLabel={
              seg.count != null ? `${seg.label}, ${seg.count}` : seg.label
            }
            // Both spellings on purpose: the web build drops accessibilityState
            // on Pressable (react-native-web forwards aria-* and role only), so
            // without aria-selected the app's one filter control read as three
            // identical tabs at towinly.com/app with no way to hear which
            // list you were looking at.
            aria-selected={active}
            accessibilityState={{ selected: active }}
            onPress={() => {
              // The tick fires only when the value actually changes (§11) —
              // re-tapping the active segment stays silent.
              if (seg.key !== value) haptic.selection();
              onChange(seg.key);
            }}
            android_ripple={pressRipple}
            // Pressed feedback (rulebook: no silent taps) — this is the primary
            // in-screen filter control on 8+ screens and previously gave none.
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 40, // min, not fixed — grows with the OS large-text setting
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {/* The chip the eye sees — the gliding lens behind it carries the
                active fill, so the chip itself stays transparent. */}
            <View
              style={{
                minHeight: 30,
                paddingVertical: 3,
                borderRadius: radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingHorizontal: 4,
              }}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={fontScaleCaps.chrome}
                style={{
                  // meta, not caption — these are navigation labels (rulebook pass)
                  fontSize: type.meta,
                  fontWeight: '600',
                  color: active ? t.blueDeep : t.inkSlate,
                  // Without flexShrink a long label ("Looking for Help") measures
                  // at its full intrinsic width and pushes the count past the
                  // chip's rounded edge, so the number reads as if it sat outside
                  // the button (user report 2026-07-26).
                  flexShrink: 1,
                }}
              >
                {seg.label}
              </Text>
              {seg.count != null ? (
                <Text
                  maxFontSizeMultiplier={fontScaleCaps.chrome}
                  style={{
                    fontSize: type.segCount,
                    color: active ? t.blueDeep : t.inkFaint2,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {seg.count}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
