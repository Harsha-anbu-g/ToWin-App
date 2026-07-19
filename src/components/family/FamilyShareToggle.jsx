// Family visibility switch (FAM-404, web US-011 parity 2026-07-19): the
// elder's per-friendship choice of what family sees. Rendered ONLY on the
// elder's MyHelpersPanel cards — helpers' MyEldersPanel never gets it.
// Default off: private until the elder says otherwise (backend V39 default).
// Sharing never moves the trust score, so no query invalidation is needed —
// the POST returns the fresh ConnectionResponse and we patch it in place.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';

// Track/knob geometry — the web control's exact numbers (40×24 track, 3px
// inset, 18px knob, 16px travel; "same geometry as the NavBar night switch").
const TRACK_W = 40;
const TRACK_H = 24;
const TRACK_PAD = 3;
const KNOB = 18;
const KNOB_TRAVEL = 16;

export default function FamilyShareToggle({ connectionId, shared: initialShared = false }) {
  const { t, type, radius } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  // Optimistic local state, like the web control: flip now, roll back on
  // failure. Server truth re-seeds on remount; a successful POST means the
  // cache and this state already agree.
  const [shared, setShared] = useState(!!initialShared);
  const slide = useRef(new Animated.Value(initialShared ? 1 : 0)).current;

  // Knob motion: transform only, ease-out, well under 300ms (Emil rule).
  // Reduce-motion gets gentler (60ms) — not zero — matching the web control.
  useEffect(() => {
    Animated.timing(slide, {
      toValue: shared ? 1 : 0,
      duration: reducedMotion ? 60 : 160,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [shared, reducedMotion, slide]);

  const save = useMutation({
    mutationFn: async (next) =>
      (await api.post(`/connections/${connectionId}/family-visibility`, { shared: next })).data,
    onSuccess: (fresh) => {
      // The response IS the caller's fresh ConnectionResponse — patch the
      // ['connections'] cache immutably so no refetch (or flash) is needed.
      if (!fresh?.id) return;
      queryClient.setQueryData(['connections'], (list) =>
        Array.isArray(list) ? list.map((c) => (c.id === fresh.id ? fresh : c)) : list
      );
    },
    onError: (_err, next) => {
      setShared(!next); // roll the optimistic flip back
      showToast("Couldn't save that change. Please try again.", 'error');
    },
  });

  const flip = () => {
    if (save.isPending) return;
    const next = !shared;
    setShared(next);
    save.mutate(next);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Let my family see this friendship"
      accessibilityState={{ checked: shared, disabled: save.isPending, busy: save.isPending }}
      disabled={save.isPending}
      onPress={flip}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: t.skyLine2,
        borderRadius: radius.input,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, lineHeight: 21 }}>
          Let my family see this friendship
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 2 }}>
          {shared
            ? 'Your family can see this friendship.'
            : 'Kept private from family. Only you can change this.'}
        </Text>
      </View>
      {/* Track paints (non-animated color swap, like the web); only the knob
          moves. actionInk = the white that rides an action fill, both themes. */}
      <View
        style={{
          width: TRACK_W + TRACK_PAD * 2,
          height: TRACK_H + TRACK_PAD * 2,
          padding: TRACK_PAD,
          borderRadius: radius.pill,
          justifyContent: 'center',
          backgroundColor: shared ? t.blue : t.slateSoft,
        }}
      >
        <Animated.View
          style={{
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: t.actionInk,
            transform: [
              { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }) },
            ],
          }}
        />
      </View>
    </Pressable>
  );
}
