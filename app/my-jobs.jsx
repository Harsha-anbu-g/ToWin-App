// My offers & jobs — one feature, one screen (reached from the ☰ menu).
import { useQueryClient } from '@tanstack/react-query';
import MyJobsCard from '../src/components/home/MyJobsCard';
import Screen from '../src/components/ui/Screen';

export default function MyJobs() {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: ['needs-applications'] });

  return (
    <Screen back title="My offers & jobs" onRefresh={reload}>
      <MyJobsCard />
    </Screen>
  );
}
