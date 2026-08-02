// Website URL parity. On the website a conversation lives at
// /messages/:connectionId; in the app it is /chat/:connectionId. Once phones
// are served the app under towinly.com/app/, every old bookmark, emailed link
// and notification pointing at the website's URL arrives here — so it has to
// land on the thread rather than a "page not found".
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MessagesByConnection() {
  const { connectionId } = useLocalSearchParams();
  return <Redirect href={`/chat/${connectionId}`} />;
}
