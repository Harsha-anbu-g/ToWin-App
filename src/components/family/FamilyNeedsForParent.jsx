// Guardian mode (MANAGE_HELP_REQUESTS, FAM-509): the family member asks for
// help on the parent's behalf and closes a request the parent no longer needs.
//
// The list itself is always visible to family — that part was never a power.
// Only the buttons wait on the parent's say-so, and the server checks the
// grant again before it lets anything through, so a power taken back stops
// working even if this screen is still open.
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import Input from '../ui/Input';

// The same everyday words the parent sees on their own form.
const CATEGORIES = [
  ['COMPANIONSHIP', 'Company'],
  ['TRANSPORTATION', 'Rides'],
  ['ERRANDS', 'Shopping'],
  ['CLEANING', 'Cleaning'],
  ['OTHER', 'Other'],
];

const URGENCIES = [
  ['NORMAL', 'Normal'],
  ['URGENT', 'Urgent'],
];

const EMPTY_FORM = { title: '', description: '', category: 'COMPANIONSHIP', urgency: 'NORMAL' };

// One selectable pill in a radio row — blue only because it is a choice the
// person can act on; selection uses the wash + deep pair, never a fill.
function ChoiceChip({ label, selected, onPress }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? t.blue : t.border,
        backgroundColor: selected ? t.blueWash : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: type.body,
          fontWeight: '600',
          color: selected ? t.blueDeep : t.inkSlate,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function FamilyNeedsForParent({
  elderId,
  elderName,
  openNeeds = [],
  canManage = false,
  onChanged,
}) {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formMsg, setFormMsg] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const parent = elderName || 'your parent';
  const needs = openNeeds || [];

  const post = useMutation({
    mutationFn: () =>
      api.post('/needs', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        urgency: form.urgency,
        // We ask; the server decides. It re-checks the parent's grant and
        // records who really typed this before the request goes out.
        onBehalfOfElderId: elderId,
      }),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setFormOpen(false);
      showToast(`Asked for help for ${parent}. Helpers will see you asked for them.`, 'success');
      onChanged?.();
    },
    onError: (err) =>
      setFormMsg(err?.response?.data?.message || 'Could not send that request. Please try again.'),
  });

  const close = useMutation({
    mutationFn: (needId) => api.delete(`/needs/${needId}`),
    onSuccess: () => {
      showToast(`Closed that request for ${parent}.`, 'success');
      onChanged?.();
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not close that request. Please try again.',
        'error'
      ),
  });

  // Nothing to say: no open requests, and no permission to add one.
  if (!canManage && needs.length === 0) return null;

  const postNeed = () => {
    if (!form.title.trim()) {
      setFormMsg(`Please write what ${parent} needs help with.`);
      return;
    }
    setFormMsg('');
    post.mutate();
  };

  const closing = close.isPending ? close.variables : null;

  return (
    <View
      style={{
        marginTop: spacing[5],
        borderTopWidth: 1,
        borderTopColor: t.border,
        paddingTop: spacing[4],
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        {parent}&apos;s open help requests
      </Text>

      {canManage ? (
        <Text style={{ fontSize: type.meta, color: t.trustGold, lineHeight: 20, marginTop: spacing[2] }}>
          {parent} asked you to handle these for them. Helpers always see your name next to theirs
          on anything you do here.
        </Text>
      ) : null}

      {needs.length === 0 ? (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[2] }}>
          {parent} has no open help requests right now.
        </Text>
      ) : null}

      {needs.map((n, i) => (
        <View
          key={n.id}
          style={{
            paddingVertical: spacing[3],
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.hairline,
            marginTop: i === 0 ? spacing[2] : 0,
          }}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{n.title}</Text>
          {n.description ? (
            <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 2 }}>
              {n.description}
            </Text>
          ) : null}
          {n.actedByName ? (
            <Text
              style={{
                fontSize: type.meta,
                fontWeight: '600',
                color: t.trustGold,
                lineHeight: 20,
                marginTop: spacing[1],
              }}
            >
              Asked by {n.actedByName}, for {parent}
            </Text>
          ) : null}

          {canManage && confirmId !== n.id ? (
            <ActionChip
              label={closing === n.id ? 'Closing…' : `Close this request for ${parent}`}
              disabled={closing === n.id}
              onPress={() => setConfirmId(n.id)}
              style={{ marginTop: spacing[3], alignSelf: 'flex-start' }}
            />
          ) : null}

          {canManage && confirmId === n.id ? (
            <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
              <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 22 }}>
                Close this for {parent}? Helpers will stop seeing it.
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                <ActionChip
                  label="Yes, close it"
                  tonal
                  onPress={() => {
                    setConfirmId(null);
                    close.mutate(n.id);
                  }}
                  style={{ flex: 1 }}
                />
                <ActionChip label="Keep it" onPress={() => setConfirmId(null)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
        </View>
      ))}

      {canManage && !formOpen ? (
        <Button
          // secondary: Message {parent} is the screen's ONE filled primary
          // (rulebook) — this opener must not compete.
          title={`Ask for help for ${parent}`}
          variant="secondary"
          onPress={() => {
            setFormOpen(true);
            setFormMsg('');
          }}
          style={{ marginTop: spacing[3] }}
        />
      ) : null}

      {canManage && formOpen ? (
        <View
          style={{
            marginTop: spacing[3],
            padding: spacing[4],
            borderWidth: 1,
            borderColor: t.skyLine2,
            borderRadius: radius.card,
            gap: spacing[4],
          }}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, lineHeight: 22 }}>
            Ask for help for {parent}
          </Text>

          <Input
            label={`What does ${parent} need help with?`}
            value={form.title}
            onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="A ride to the doctor on Tuesday"
          />

          <Input
            label="Anything else a helper should know? (optional)"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
          />

          <View>
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, marginBottom: spacing[2] }}>
              What kind of help?
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="What kind of help?"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}
            >
              {CATEGORIES.map(([key, label]) => (
                <ChoiceChip
                  key={key}
                  label={label}
                  selected={form.category === key}
                  onPress={() => setForm((f) => ({ ...f, category: key }))}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, marginBottom: spacing[2] }}>
              How soon does {parent} need it?
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={`How soon does ${parent} need it?`}
              style={{ flexDirection: 'row', gap: spacing[2] }}
            >
              {URGENCIES.map(([key, label]) => (
                <ChoiceChip
                  key={key}
                  label={label}
                  selected={form.urgency === key}
                  onPress={() => setForm((f) => ({ ...f, urgency: key }))}
                />
              ))}
            </View>
          </View>

          {formMsg ? (
            // Wrapped as one alert node so a rejected request is spoken, not only drawn.
            <View accessible accessibilityRole="alert">
              <Text style={{ fontSize: type.meta, fontWeight: '500', color: t.redDeep, lineHeight: 20 }}>
                {formMsg}
              </Text>
            </View>
          ) : null}

          <Text style={{ fontSize: type.meta, color: t.trustGold, lineHeight: 20 }}>
            This goes out as {parent}&apos;s request, with your name on it as the person who asked.
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Button
              title={post.isPending ? 'Sending…' : `Send for ${parent}`}
              variant="secondary"
              onPress={postNeed}
              disabled={post.isPending}
              style={{ flex: 1 }}
            />
            <ActionChip
              label="Never mind"
              onPress={() => {
                setFormOpen(false);
                setFormMsg('');
              }}
              style={{ flex: 1, minHeight: 44 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
