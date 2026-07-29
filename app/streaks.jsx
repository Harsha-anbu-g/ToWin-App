// Orphaned duplicate (rulebook pass follow-up): the redesign moved daily
// check-in to app/checkin.jsx (home's daily prompt + the menu's "Daily
// check-in"), leaving this route unreachable. It now forwards there so any
// stale link lands on the live surface — one feature, one screen. The file
// itself is kept pending the user's explicit call on deletion.
import { Redirect } from 'expo-router';

export default function StreaksScreen() {
  return <Redirect href="/checkin" />;
}
