// The shared key every caller must present. Compared in constant time so the
// length of a wrong guess leaks nothing.
import { timingSafeEqual } from 'node:crypto';

export function authorized(authorizationHeader, key) {
  if (!key) return false;
  const got = Buffer.from(String(authorizationHeader || ''));
  const want = Buffer.from(`Bearer ${key}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
