// Website URL parity: the family hub is /family-home on the website and
// /family in the app. Kept so links from the website land on the hub.
import { Redirect } from 'expo-router';

export default function FamilyHomeAlias() {
  return <Redirect href="/family" />;
}
