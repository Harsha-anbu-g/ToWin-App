// Website URL parity: /family-home/parent/:elderId on the website is
// /family/parent/:elderId in the app. This is the screen a guardian is sent to
// from a family alert, so a broken link here means a worried family member
// hitting a dead end.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function FamilyHomeParentAlias() {
  const { elderId } = useLocalSearchParams();
  return <Redirect href={`/family/parent/${elderId}`} />;
}
