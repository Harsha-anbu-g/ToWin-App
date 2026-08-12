// Website URL parity. On the website a conversation lives at
// /messages/:connectionId; in the app it is /chat/:connectionId. Once phones
// are served the app under towinly.com/app/, every old bookmark, emailed link
// and notification pointing at the website's URL arrives here — so it has to
// land on the thread rather than a "page not found".
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MessagesByConnection() {
  const { connectionId, ...rest } = useLocalSearchParams();
  // The query string is part of which thread was asked for: the website links
  // the family updates group as /messages/:id?channel=family (web
  // FamilyThreadLink.jsx), and /chat reads that channel to open the shared
  // thread instead of the private one. Forwarding the id alone would drop a
  // family reader into a conversation the server refuses them, so everything
  // riding alongside the id travels with it.
  const query = Object.entries(rest)
    .flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter((v) => v !== undefined && v !== null && v !== '')
        .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
    )
    .join('&');
  return <Redirect href={query ? `/chat/${connectionId}?${query}` : `/chat/${connectionId}`} />;
}
