// Small copy helpers shared across screens. Port of Towinly/frontend/src/lib/copy.js.

// "1 helper wants to help" / "3 helpers want to help"
export function applicantsLabel(count) {
  const one = count === 1;
  return `${count} helper${one ? '' : 's'} want${one ? 's' : ''} to help`;
}

// Plain-English relative time for card meta lines ("posted yesterday").
// Coarse on purpose — elders read words, not timestamps.
export function timeAgo(iso, now = new Date()) {
  if (!iso) return '';
  const then = new Date(iso);
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

// "July 17 at 12:00 PM" — family-alert timestamps (web FamilyHome parity,
// FAM-402). Absolute, not relative: an SOS from two days ago must read as a
// date, never soften into "2 days ago".
export function friendlyDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

// Full years between a YYYY-MM-DD birthdate and now (birthday counts).
// The date string is split by hand so no timezone shift can move the day.
export function yearsOld(dob, now = new Date()) {
  const [birthYear, birthMonth, birthDay] = dob.split('-').map(Number);
  let years = now.getFullYear() - birthYear;
  const beforeBirthday =
    now.getMonth() + 1 < birthMonth ||
    (now.getMonth() + 1 === birthMonth && now.getDate() < birthDay);
  if (beforeBirthday) years -= 1;
  return years;
}
