// Website URL parity: the website nests this under /profile/change-password;
// the app keeps it at the top level. Kept so a link from the website's profile
// page lands on the real screen.
import { Redirect } from 'expo-router';

export default function ChangePasswordAlias() {
  return <Redirect href="/change-password" />;
}
