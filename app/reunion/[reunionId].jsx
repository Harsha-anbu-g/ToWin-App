// One reunion: the ladder, where it stands, and the panel for the current
// step. Nothing moves without the elder's tap on steps 3 and 4; the day and
// the send-off are either side's; the elder can stop at any time, the
// organiser can step down before the day.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from '../../src/components/icons';
import { advanceReunion, closeReunion, getReunion, stepDownFromReunion, stopReunion } from '../../src/api/reunions';
import GuestList from '../../src/components/reunion/GuestList';
import OrganiserPicker from '../../src/components/reunion/OrganiserPicker';
import PlanCard from '../../src/components/reunion/PlanCard';
import ReunionLadder from '../../src/components/reunion/ReunionLadder';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { STEP_EXPLAINS, STEP_NAMES, nextAction, stepIndex } from '../../src/lib/reunionSteps';
import { writeErrorLine } from '../../src/lib/writeErrorLine';
import { useTheme } from '../../src/theme/ThemeContext';
import { tr } from '../../src/i18n';

const MODE_FOR = { FINDING: 'finding', PLAN: 'plan', DAY: 'day', SEND_OFF: 'sendoff' };

export default function ReunionPage() {
  const { t, text, type, fontFamily, spacing } = useTheme();
  const router = useRouter();
  const { reunionId } = useLocalSearchParams();
  const id = Array.isArray(reunionId) ? reunionId[0] : reunionId;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [thankYou, setThankYou] = useState('');

  const { data: reunion, isLoading, isError, refetch } = useQuery({
    queryKey: ['reunion', id],
    queryFn: () => getReunion(id),
    enabled: !!id,
  });

  const settle = {
    onSuccess: (fresh) => {
      queryClient.setQueryData(['reunion', id], fresh);
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
    },
    onError: (err) => showToast(writeErrorLine(err, tr('Could not do that right now. Please try again.')), 'error'),
  };
  const advance = useMutation({ mutationFn: () => advanceReunion(id), ...settle });
  const close = useMutation({ mutationFn: () => closeReunion({ reunionId: id, thankYou: thankYou.trim() }), ...settle });
  const stop = useMutation({ mutationFn: () => stopReunion(id), ...settle });
  const stepDown = useMutation({
    mutationFn: () => stepDownFromReunion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
      showToast(tr('You stepped down. The elder has been told.'), 'info');
      router.back();
    },
    onError: settle.onError,
  });

  if (isLoading || !reunion) {
    return (
      <Screen back title={tr('Reunion')} onRefresh={refetch}>
        {isError ? <LoadError what={tr('this reunion')} onRetry={refetch} /> : <SkeletonCard lines={4} />}
      </Screen>
    );
  }

  const isElder = reunion.myRole === 'ELDER';
  const step = reunion.step;
  const idx = stepIndex(step);
  const stopped = step === 'STOPPED';
  const done = step === 'DONE';
  const over = stopped || done;
  const action = nextAction(reunion, reunion.myRole);
  const canEditGuests = !isElder && (step === 'FINDING' || step === 'PLAN');
  const mode = MODE_FOR[step] ?? 'read';
  const busy = advance.isPending || close.isPending;

  const askStop = async () => {
    const ok = await confirm({
      title: tr('Stop this reunion?'),
      message: tr('Your organiser will be told. The guest list stays, and you can wish again later.'),
      cancelLabel: tr('Keep going'),
      confirmLabel: tr('Stop it'),
      destructive: true,
    });
    if (ok) stop.mutate();
  };
  const askStepDown = async () => {
    const ok = await confirm({
      title: tr('Step down from planning?'),
      message: tr('{name} will be asked to choose someone else. The guest list stays.', { name: reunion.elderName }),
      cancelLabel: tr('Keep planning'),
      confirmLabel: tr('Step down'),
      destructive: true,
    });
    if (ok) stepDown.mutate();
  };

  const sub = [reunion.years, reunion.city].filter(Boolean).join(' · ');
  const withLine = isElder
    ? reunion.organiserName
      ? tr('{name} is planning it', { name: reunion.organiserName })
      : null
    : tr('For {name}', { name: reunion.elderName });

  return (
    <Screen back title={tr('Reunion')} onRefresh={refetch} keyboard>
      <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, letterSpacing: -0.4 }}>
        {reunion.institution}
      </Text>
      {sub ? <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 4 }}>{sub}</Text> : null}
      {withLine ? <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 4 }}>{withLine}</Text> : null}

      <View style={{ marginTop: spacing[4] }}>
        <Text style={{ fontSize: type.caption, color: stopped ? t.ink4 : t.blueDeep, fontWeight: '600' }}>
          {stopped
            ? tr('Stopped')
            : tr('Step {n} of 7 · {name}', { n: idx + 1, name: tr(STEP_NAMES[idx]) })}
        </Text>
        <ReunionLadder stepIndex={idx} done={done} style={{ marginTop: spacing[2] }} />
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, marginTop: spacing[3] }}>
          {stopped ? tr('This reunion was stopped.') : tr(STEP_EXPLAINS[idx])}
        </Text>
      </View>

      <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
        {step === 'ORGANISER' && isElder ? <OrganiserPicker reunionId={id} /> : null}

        {step === 'PLAN' || step === 'DAY' ? (
          <PlanCard reunion={reunion} canEdit={!isElder && step === 'PLAN'} />
        ) : null}

        {step !== 'ORGANISER' ? (
          <GuestList
            reunion={reunion}
            mode={mode}
            canEdit={canEditGuests}
            addVariant={step === 'FINDING' ? 'primary' : 'secondary'}
          />
        ) : null}

        {step === 'SEND_OFF' ? (
          <Card>
            <Input
              label={tr('A thank-you to each guest')}
              value={thankYou}
              onChangeText={setThankYou}
              helper={tr('Goes to everyone who came, with Towinly’s name on it.')}
              multiline
              inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>
        ) : null}

        {done ? (
          <Card>
            {reunion.thankYou ? (
              <Text style={{ fontSize: type.body, color: t.ink, lineHeight: 24, fontStyle: 'italic' }}>“{reunion.thankYou}”</Text>
            ) : null}
            <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, marginTop: reunion.thankYou ? spacing[3] : 0 }}>
              {tr('{count} came, and every one of them got home.', { count: reunion.arrivedCount ?? 0 })}
            </Text>
            {isElder ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('Keep the story in your box')}
                onPress={() => router.push('/pass-on')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 44,
                  marginTop: spacing[3],
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ flex: 1, fontSize: type.body, fontWeight: '600', color: t.blueDeep }}>
                  {tr('Keep the story in your box')}
                </Text>
                <ChevronRight size={18} color={t.blueDeep} />
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        {action.show ? (
          <View style={{ marginTop: spacing[2] }}>
            <Button
              title={action.label}
              onPress={() => (action.closes ? close.mutate() : advance.mutate())}
              disabled={!action.enabled}
              loading={busy}
            />
            {!action.enabled && action.reason ? (
              <Text style={{ fontSize: type.caption, color: t.inkSlate, lineHeight: 20, marginTop: spacing[2], textAlign: 'center' }}>
                {action.reason}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isElder && !over ? (
          <Button title={tr('Stop this reunion')} variant="text" onPress={askStop} loading={stop.isPending} />
        ) : null}
        {!isElder && (step === 'FINDING' || step === 'PLAN') ? (
          <Button title={tr('Step down from planning')} variant="text" onPress={askStepDown} loading={stepDown.isPending} />
        ) : null}
      </View>
    </Screen>
  );
}
