// The sentence to show when a reunion write is refused. A 400 carries the
// server's own plain line (the money rule, a step that already moved on), and
// that line names the fix, so it beats a generic one (HCI rule 9). Anything
// else goes through friendlyWriteError, which knows the unverified-email case.
import { friendlyWriteError } from '../api/client';

export function writeErrorLine(error, fallback) {
  const message = error?.response?.data?.message;
  if (error?.response?.status === 400 && typeof message === 'string' && message.trim()) return message;
  return friendlyWriteError(error, fallback);
}
