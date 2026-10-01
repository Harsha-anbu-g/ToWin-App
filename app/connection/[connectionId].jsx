// A helper or elder, on their own page (owner call 2026-09-25: a name on Home
// opens a page like WhatsApp, not a dropdown). Same seat rule as Home: a
// HELPER sees their elders, everyone else sees their helpers.
import { useLocalSearchParams } from 'expo-router';
import ElderSeatDetail from '../../src/components/trust/ElderSeatDetail';
import HelperSeatDetail from '../../src/components/trust/HelperSeatDetail';
import { useAuth } from '../../src/context/AuthContext';

export default function ConnectionPage() {
  const { connectionId } = useLocalSearchParams();
  const { user } = useAuth();
  const Detail = user?.role === 'HELPER' ? ElderSeatDetail : HelperSeatDetail;
  return <Detail connectionId={String(connectionId)} />;
}
