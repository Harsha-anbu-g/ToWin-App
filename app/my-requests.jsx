// My requests — superseded: Posted Help is the elder's second tab (redesign,
// 2026-07-12). The route stays as a redirect so older links and deep links
// land in the right place. List source: src/components/needs/PostedHelpList.
import { Redirect } from 'expo-router';

export default function MyRequests() {
  return <Redirect href="/(tabs)/posted-help" />;
}
