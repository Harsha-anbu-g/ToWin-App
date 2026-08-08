// Consent flow, family side (FAM-508): each power is on, waiting, or askable.
// Asking never grants anything; it puts a plain yes/no card in front of the
// parent, in the same words their Controls switches use (lib/familyPowers).
// The 7-day re-ask cooldown lives server-side — its message is surfaced, not
// duplicated here.
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { POWERS } from '../../lib/familyPowers';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';

export default function FamilyPowerAsks({ link, elderName, onChanged }) {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();

  const parent = elderName || 'your parent';
  const powers = link?.delegatedPowers || [];
  // Powers I've asked for that are still waiting on their answer.
  const pendingAsks = (link?.pendingPowerRequests || []).map((r) => r.power);

  const ask = useMutation({
    mutationFn: (powerKey) => api.post(`/family/links/${link.id}/power-requests`, { power: powerKey }),
    onSuccess: () => {
      showToast(`Asked. ${parent} decides on their My Family page.`, 'success');
      onChanged?.();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not send the ask. Please try again.', 'error'),
  });

  if (!link) return null;
  const asking = ask.isPending ? ask.variables : null;

  return (
    <View style={{ marginTop: spacing[5] }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        What I can do for {parent}
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: spacing[1] }}>
        {parent} decides each of these, and anything you do carries your name.
      </Text>

      {POWERS.map((p, i) => {
        const isGranted = powers.includes(p.key);
        const isWaiting = pendingAsks.includes(p.key);
        return (
          <View
            key={p.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              paddingVertical: spacing[3],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.hairline,
              marginTop: i === 0 ? spacing[2] : 0,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{p.title}</Text>
              <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 2 }}>
                {isGranted
                  ? `${parent} lets you do this.`
                  : isWaiting
                    ? `You asked. Waiting for ${parent} to decide. They answer on their My Family page.`
                    : p.key === 'LEAVE_REVIEWS'
                      ? `Not on yet. You can ask ${parent}. Reviews unlock when a friendship is fully trusted.`
                      : `Not on yet. You can ask ${parent}.`}
              </Text>
            </View>
            {isGranted ? (
              // A state label, not a button — green = achieved.
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  borderWidth: 1,
                  borderColor: t.greenLine,
                  borderRadius: radius.pill,
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                }}
              >
                <Check size={14} color={t.greenDeep} strokeWidth={2.5} />
                <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep }}>On</Text>
              </View>
            ) : isWaiting ? (
              <View
                style={{
                  backgroundColor: t.chipNeutral,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: radius.pill,
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}>
                  Waiting
                </Text>
              </View>
            ) : (
              <ActionChip
                label={asking === p.key ? 'Asking…' : `Ask ${parent}`}
                tonal
                disabled={ask.isPending}
                onPress={() => ask.mutate(p.key)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
