// Dashboard — superseded: My Helpers lives on Home now (user decision
// 2026-07-12). The route stays so older links (check-in flows, menu items)
// land in the right place. Panel source: src/components/trust/MyHelpersPanel.
import { Redirect } from 'expo-router';

export default function Dashboard() {
  return <Redirect href="/(tabs)/home" />;
}
