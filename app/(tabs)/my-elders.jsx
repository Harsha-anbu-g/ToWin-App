// My Elders — superseded: the helper's hub IS the first tab now (user
// decision 2026-07-12). The route stays so older links land right.
// Panel source: src/components/trust/MyEldersPanel.
import { Redirect } from 'expo-router';

export default function MyElders() {
  return <Redirect href="/(tabs)/home" />;
}
