// Steps 3 to 6, the guest list. One row per person. The tools change with the
// step: while finding, a state moves forward one tap at a time; on the day,
// "Arrived"; at the send-off, "Home". Nothing else on the row.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Trash2 } from '../icons';
import {
  addReunionGuest,
  checkInReunionGuest,
  confirmReunionGuestHome,
  removeReunionGuest,
  setReunionGuestState,
} from '../../api/reunions';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { guestStateLabel } from '../../lib/reunionSteps';
import { writeErrorLine } from '../../lib/writeErrorLine';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { tr } from '../../i18n';

const NEXT_STATE = { REMEMBERED: 'FOUND', FOUND: 'REACHED', REACHED: 'COMING' };

function useGuestWrites(reunionId) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const settle = {
    onSuccess: (fresh) => {
      queryClient.setQueryData(['reunion', reunionId], fresh);
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
    },
    onError: (err) => showToast(writeErrorLine(err, tr('Could not save that right now. Please try again.')), 'error'),
  };
  return {
    add: useMutation({ mutationFn: (g) => addReunionGuest({ reunionId, ...g }), ...settle }),
    setState: useMutation({ mutationFn: ({ guestId, state }) => setReunionGuestState({ reunionId, guestId, state }), ...settle }),
    remove: useMutation({ mutationFn: (guestId) => removeReunionGuest({ reunionId, guestId }), ...settle }),
    arrived: useMutation({ mutationFn: (guestId) => checkInReunionGuest({ reunionId, guestId }), ...settle }),
    home: useMutation({ mutationFn: (guestId) => confirmReunionGuestHome({ reunionId, guestId }), ...settle }),
  };
}

function AddGuest({ onAdd, adding, variant }) {
  const { spacing } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const submit = () => {
    if (!name.trim()) {
      setError(tr('A name, at least.'));
      return;
    }
    setError(null);
    onAdd({ name: name.trim(), phone: phone.trim(), note: note.trim() }, () => {
      setName('');
      setPhone('');
      setNote('');
    });
  };
  return (
    <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
      <Input
        label={tr('Name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (error) setError(null);
        }}
        error={error}
        autoCapitalize="words"
      />
      <Input label={tr('Phone, if known')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input
        label={tr('Note')}
        value={note}
        onChangeText={setNote}
        helper={tr('Mobility, hearing, diet, who has their number. Never money.')}
        autoCapitalize="sentences"
      />
      <Button title={tr('Add to the list')} onPress={submit} loading={adding} variant={variant} />
    </View>
  );
}

function GuestTools({ guest, mode, writes }) {
  const { t, type, spacing } = useTheme();
  const busy = writes.setState.isPending || writes.arrived.isPending || writes.home.isPending;

  if (mode === 'finding' || mode === 'plan') {
    const next = NEXT_STATE[guest.state];
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] }}>
        {next ? (
          <ActionChip
            label={guestStateLabel(next)}
            disabled={busy}
            onPress={() => writes.setState.mutate({ guestId: guest.id, state: next })}
          />
        ) : null}
        {guest.state === 'CANNOT_COME' ? (
          <ActionChip
            label={tr('Coming after all')}
            tonal
            disabled={busy}
            onPress={() => writes.setState.mutate({ guestId: guest.id, state: 'COMING' })}
          />
        ) : (
          <ActionChip
            label={tr('Cannot come')}
            tonal
            disabled={busy}
            onPress={() => writes.setState.mutate({ guestId: guest.id, state: 'CANNOT_COME' })}
          />
        )}
      </View>
    );
  }
  if (mode === 'day' && guest.state === 'COMING') {
    return guest.arrivedAt ? (
      <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.leaf, marginTop: spacing[2] }}>{tr('Arrived')}</Text>
    ) : (
      <View style={{ flexDirection: 'row', marginTop: spacing[2] }}>
        <ActionChip label={tr('Arrived')} disabled={busy} onPress={() => writes.arrived.mutate(guest.id)} />
      </View>
    );
  }
  if (mode === 'sendoff' && guest.arrivedAt) {
    return guest.homeAt ? (
      <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.leaf, marginTop: spacing[2] }}>{tr('Home safe')}</Text>
    ) : (
      <View style={{ flexDirection: 'row', marginTop: spacing[2] }}>
        <ActionChip label={tr('Home')} disabled={busy} onPress={() => writes.home.mutate(guest.id)} />
      </View>
    );
  }
  return null;
}

function statusLine(guest, mode) {
  if (guest.homeAt) return tr('Home safe');
  if (guest.arrivedAt) return tr('Arrived');
  if ((mode === 'day' || mode === 'sendoff') && guest.state !== 'COMING') return guestStateLabel(guest.state);
  return guestStateLabel(guest.state);
}

export default function GuestList({ reunion, mode, canEdit, addVariant = 'secondary' }) {
  const { t, type, spacing } = useTheme();
  const confirm = useConfirm();
  const writes = useGuestWrites(reunion.id);
  const guests = Array.isArray(reunion.guests) ? reunion.guests : [];

  const removeGuest = async (g) => {
    const ok = await confirm({
      title: tr('Take {name} off the list?', { name: g.name }),
      cancelLabel: tr('Keep'),
      confirmLabel: tr('Take off'),
      destructive: true,
    });
    if (ok) writes.remove.mutate(g.id);
  };

  return (
    <Card>
      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{tr('Guests')}</Text>
      {guests.length === 0 ? (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, marginTop: spacing[2] }}>
          {canEdit ? tr('Start with the names remembered. One at a time.') : tr('No guests yet.')}
        </Text>
      ) : (
        guests.map((g, i) => (
          <View
            key={g.id ?? `${g.name}-${i}`}
            style={{
              paddingVertical: spacing[3],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.hairline,
              marginTop: i === 0 ? spacing[2] : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{g.name}</Text>
                <Text style={{ fontSize: type.caption, color: t.blueDeep, marginTop: 2 }}>{statusLine(g, mode)}</Text>
                {g.phone ? <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{g.phone}</Text> : null}
                {g.note ? (
                  <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2, lineHeight: 20 }}>{g.note}</Text>
                ) : null}
              </View>
              {canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('Take {name} off the list', { name: g.name })}
                  hitSlop={8}
                  onPress={() => removeGuest(g)}
                  style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
                >
                  <Trash2 size={18} color={t.ink4} />
                </Pressable>
              ) : null}
            </View>
            <GuestTools guest={g} mode={canEdit ? mode : mode === 'finding' || mode === 'plan' ? 'read' : mode} writes={writes} />
          </View>
        ))
      )}
      {canEdit ? (
        <AddGuest
          variant={addVariant}
          adding={writes.add.isPending}
          onAdd={(g, reset) => writes.add.mutate(g, { onSuccess: reset })}
        />
      ) : null}
    </Card>
  );
}
