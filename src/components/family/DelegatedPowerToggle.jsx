// Guardian mode (FAM-503, web parity 2026-07-26): the parent decides, one
// thing at a time, what a family member may do for them. The powers live in
// lib/familyPowers so this switch list, the elder's approval cards and the
// family side's "what I can do" list all speak the same words. Each switch
// sends the WHOLE set the parent wants to keep, matching the endpoint's
// replace semantics: an unticked power is simply absent, so nothing is left
// half-on. Optimistic flip; the server's answer is the record that decides.
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { POWERS } from '../../lib/familyPowers';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';

// Track/knob geometry — same numbers as FamilyShareToggle (the web control's
// 40×24 track, 3px inset, 18px knob, 16px travel).
const TRACK_W = 40;
const TRACK_H = 24;
const TRACK_PAD = 3;
const KNOB = 18;
const KNOB_TRAVEL = 16;

// One switch row. Owns its own knob animation so three rows never share an
// Animated.Value. Knob motion: transform only, ease-out, well under 300ms
// (Emil rule); reduce-motion SNAPS via setValue — the app convention.
function PowerSwitch({ power, name, isOn, busy, onFlip }) {
  const { t, type, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(isOn ? 1 : 0)).current;

  useEffect(() => {
    const dest = isOn ? 1 : 0;
    if (reducedMotion) {
      slide.setValue(dest);
      return;
    }
    Animated.timing(slide, {
      toValue: dest,
      duration: 160,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [isOn, reducedMotion, slide]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`${power.title}, ${name}`}
      accessibilityState={{ checked: isOn, disabled: busy, busy }}
      disabled={busy}
      onPress={onFlip}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: t.skyLine2,
        borderRadius: radius.input,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, lineHeight: 21 }}>
          {power.title}
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 2 }}>
          {isOn ? power.on(name) : power.off(name)}
        </Text>
      </View>
      <View
        style={{
          width: TRACK_W + TRACK_PAD * 2,
          height: TRACK_H + TRACK_PAD * 2,
          padding: TRACK_PAD,
          borderRadius: radius.pill,
          justifyContent: 'center',
          backgroundColor: isOn ? t.blue : t.slateSoft,
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

export default function DelegatedPowerToggle({ linkId, familyName, powers = [], onSaved }) {
  const { t, type } = useTheme();
  const { showToast } = useToast();
  const name = familyName || 'They';

  // Optimistic local set, rolled back on failure. The server's reply
  // (the fresh link) overwrites the guess: it is the record that decides.
  const [granted, setGranted] = useState(() => new Set(powers));
  const [savingKey, setSavingKey] = useState(null);
  const previousRef = useRef(null); // the set to restore if the PUT fails

  const save = useMutation({
    mutationFn: async (next) =>
      (await api.put(`/family/links/${linkId}/powers`, { powers: [...next] })).data,
    onSuccess: (fresh) => {
      setGranted(new Set(fresh?.delegatedPowers || []));
      onSaved?.(fresh);
    },
    onError: () => {
      if (previousRef.current) setGranted(previousRef.current);
      showToast("Couldn't save that change. Please try again.", 'error');
    },
    onSettled: () => setSavingKey(null),
  });

  // Server-truth re-sync (same contract as FamilyShareToggle): the links
  // list refetches while this card stays mounted, so a changed prop must
  // reach the switches without a remount — unless our own flip is in flight.
  const lastSyncedProp = useRef(JSON.stringify([...powers].sort()));
  useEffect(() => {
    const incoming = JSON.stringify([...powers].sort());
    if (save.isPending) return;
    if (lastSyncedProp.current === incoming) return;
    lastSyncedProp.current = incoming;
    setGranted(new Set(powers));
  }, [powers, save.isPending]);

  const flip = (key) => {
    if (save.isPending) return;
    previousRef.current = granted;
    const next = new Set(granted);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setGranted(next); // optimistic — rolled back on failure
    setSavingKey(key);
    save.mutate(next);
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>Act for me</Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 2, marginBottom: 4 }}>
        Sharing lets {name} see. These let {name} act. Each one stays off until you turn it on,
        and their name is always on whatever they do.
      </Text>
      {POWERS.map((p) => (
        <PowerSwitch
          key={p.key}
          power={p}
          name={name}
          isOn={granted.has(p.key)}
          busy={savingKey === p.key && save.isPending}
          onFlip={() => flip(p.key)}
        />
      ))}
    </View>
  );
}
