// Family visibility switch (FAM-404, web US-011 parity 2026-07-19): the
// elder's per-friendship choice of what family sees. Rendered ONLY on the
// elder's MyHelpersPanel cards — helpers' MyEldersPanel never gets it.
// Default off: private until the elder says otherwise (backend V39 default).
// Sharing never moves the trust score, so no query invalidation is needed —
// the POST returns the fresh ConnectionResponse and we patch it in place.
//
// Owner call 2026-08-17 ("the switch for the family is not good"): the
// hand-drawn web-parity track is retired for the platform's native Switch —
// the control every other app uses — in a plain settings-style row.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export default function FamilyShareToggle({ connectionId, shared: initialShared = false }) {
  const { t, type } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Optimistic local state, like the web control: flip now, roll back on
  // failure. A successful POST means the cache and this state already agree.
  const [shared, setShared] = useState(!!initialShared);

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

  // Server-truth re-sync (FAM-407 2026-07-19): ['connections'] refetches
  // while the card stays MOUNTED (Home pull-to-refresh, MyHelpersPanel
  // invalidations), so the prop can change without a remount — adopt a
  // CHANGED prop unless our own mutation is in flight (the optimistic flip
  // owns the state until it settles or rolls back). The ref keeps an
  // unchanged-but-stale prop from clobbering a just-saved flip.
  const lastSyncedProp = useRef(!!initialShared);
  useEffect(() => {
    if (save.isPending) return;
    if (lastSyncedProp.current === !!initialShared) return;
    lastSyncedProp.current = !!initialShared;
    setShared(!!initialShared);
  }, [initialShared, save.isPending]);

  const flip = (next) => {
    if (save.isPending) return;
    setShared(next);
    save.mutate(next);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, marginTop: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink, lineHeight: 18 }}>
          Let my family see this friendship
        </Text>
        <Text style={{ fontSize: type.caption, color: t.inkSlate, lineHeight: 16, marginTop: 2 }}>
          {shared
            ? 'Your family can see this friendship.'
            : 'Kept private from family. Only you can change this.'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Let my family see this friendship"
        value={shared}
        disabled={save.isPending}
        onValueChange={flip}
        trackColor={{ false: t.slateSoft, true: t.blue }}
        ios_backgroundColor={t.slateSoft}
      />
    </View>
  );
}
