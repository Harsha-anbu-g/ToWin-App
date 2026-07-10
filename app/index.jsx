// Route by auth state (mirrors the web's PublicRoute/PrivateRoute logic):
// visitor -> welcome; unverified user -> verify-pending gate; user -> tabs.
// Waits for the SecureStore restore (booted) so a logged-in user never
// flashes the welcome screen on cold start.
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, booted } = useAuth();

  if (!booted) return null; // splash background holds until restore finishes

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.role === 'ADMIN') return <Redirect href="/admin" />; // web parity: admins never see the feeds
  if (user.emailVerified === false) return <Redirect href="/(auth)/verify-pending" />;
  return <Redirect href="/(tabs)/home" />;
}
