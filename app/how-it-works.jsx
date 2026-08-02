// Website URL parity: /how-it-works on the website is the Guide in the app.
//
// Phones are meant to get the WEBSITE's version of this page — it is a
// marketing page and it stays with the marketing site. This alias is for the
// other direction: a link inside the app, or a saved /app/how-it-works URL,
// which must land on the Guide rather than nothing.
import { Redirect } from 'expo-router';

export default function HowItWorksAlias() {
  return <Redirect href="/guide" />;
}
