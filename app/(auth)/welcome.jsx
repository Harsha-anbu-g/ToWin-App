// Welcome — superseded by the landing story (3o). The route stays so any
// stale link or saved state lands correctly; the index route decides where
// to go (story on first launch, Log In afterwards, Home when signed in).
import { Redirect } from 'expo-router';

export default function Welcome() {
  return <Redirect href="/" />;
}
