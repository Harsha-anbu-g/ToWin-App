// My offers & jobs — the helper's applications (GET /needs/applications:
// NeedResponse[] carrying myApplicationStatus).
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import api from '../../api/client';
import Card from '../ui/Card';
import { catLabel } from '../../lib/needs';
import { useTheme } from '../../theme/ThemeContext';

const MY_STATUS = {
  PENDING: { label: 'Waiting for the elder', color: 'inkSlate', bg: 'chipNeutral' },
  ACCEPTED: { label: "You're helping", color: 'greenDeep', bg: 'greenTint' },
  DECLINED: { label: 'Not this time', color: 'inkSlate', bg: 'surface2' },
};

export default function MyJobsCard() {
  const { t, spacing, radius, text, fontFamily } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: async () => (await api.get('/needs/applications')).data,
  });
  const jobs = Array.isArray(data) ? data : data?.content ?? [];

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        My offers & jobs
      </Text>

      {isLoading ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, color: t.inkSlate }}>Loading…</Text>
      ) : jobs.length === 0 ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          Nothing yet. Offer to help with a request and it will show up here.
        </Text>
      ) : (
        jobs.map((need, i) => {
          const pill = MY_STATUS[need.myApplicationStatus] ?? MY_STATUS.PENDING;
          return (
            <View
              key={need.id}
              style={{
                paddingTop: spacing[4],
                marginTop: spacing[4],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.hairline,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: spacing[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>{need.title}</Text>
                <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
                  {catLabel(need.category)}
                  {need.elderName ? ` · for ${need.elderName}` : ''}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: t[pill.bg],
                  borderRadius: radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: text.xs, fontWeight: '600', color: t[pill.color] }}>{pill.label}</Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}
