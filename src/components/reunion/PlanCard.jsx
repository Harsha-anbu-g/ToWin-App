// Step 4, the plan, in words the elder reads. The organiser writes it; the
// elder reads it and approves from the page. Five fields, nothing coded.
// The form seeds from the reunion once and then keeps what is typed: a guest
// state change on the same page refetches the reunion, and that must never
// wipe a half-written plan (HCI rule 9).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { setReunionPlan } from '../../api/reunions';
import { useToast } from '../../context/ToastContext';
import { writeErrorLine } from '../../lib/writeErrorLine';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { tr } from '../../i18n';

function Line({ label, value }) {
  const { t, type, spacing } = useTheme();
  if (!value) return null;
  return (
    <View style={{ marginTop: spacing[3] }}>
      <Text style={{ fontSize: type.caption, color: t.inkSlate }}>{label}</Text>
      <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 24, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function PlanCard({ reunion, canEdit, variant = 'primary' }) {
  const { t, type, spacing } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [plannedOn, setPlannedOn] = useState(reunion.plannedOn ?? '');
  const [venue, setVenue] = useState(reunion.venue ?? '');
  const [rides, setRides] = useState(reunion.rides ?? '');
  const [food, setFood] = useState(reunion.food ?? '');
  const [budget, setBudget] = useState(reunion.budget ?? '');

  const save = useMutation({
    mutationFn: () => setReunionPlan({ reunionId: reunion.id, plannedOn, venue, rides, food, budget }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(['reunion', reunion.id], fresh);
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
      showToast(tr('Plan saved.'), 'success');
    },
    onError: (err) => showToast(writeErrorLine(err, tr('Could not save the plan right now. Please try again.')), 'error'),
  });

  const empty = !reunion.plannedOn && !reunion.venue && !reunion.rides && !reunion.food && !reunion.budget;

  return (
    <Card>
      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{tr('The plan')}</Text>
      {canEdit ? (
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          <Input label={tr('When')} value={plannedOn} onChangeText={setPlannedOn} helper={tr('Sunday 14 December, 11 in the morning')} />
          <Input label={tr('Where')} value={venue} onChangeText={setVenue} helper={tr('A public place or a family home. Never your own.')} />
          <Input label={tr('Rides')} value={rides} onChangeText={setRides} helper={tr('Who brings whom, and who takes them home.')} multiline />
          <Input label={tr('Food')} value={food} onChangeText={setFood} multiline />
          <Input label={tr('Who covers what')} value={budget} onChangeText={setBudget} helper={tr('Never a guest.')} />
          <Button title={tr('Save the plan')} onPress={() => save.mutate()} loading={save.isPending} variant={variant} />
        </View>
      ) : empty ? (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, marginTop: spacing[2] }}>
          {tr('Your organiser is still writing the plan.')}
        </Text>
      ) : (
        <View>
          <Line label={tr('When')} value={reunion.plannedOn} />
          <Line label={tr('Where')} value={reunion.venue} />
          <Line label={tr('Rides')} value={reunion.rides} />
          <Line label={tr('Food')} value={reunion.food} />
          <Line label={tr('Who covers what')} value={reunion.budget} />
        </View>
      )}
    </Card>
  );
}
