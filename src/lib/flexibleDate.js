// Forgiving date input (rulebook §16, Postel's Law): elders type dates the
// way they think of them — "14 May 1953", "1953-05-14", "14/05/1953". Accept
// every UNAMBIGUOUS reasonable form and normalize to YYYY-MM-DD; refuse the
// genuinely ambiguous (04/05/1953 means April in the US and May in India)
// rather than guess someone's birthday wrong.
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n) => String(n).padStart(2, '0');

const valid = (y, m, d) => {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
};

const checked = (y, m, d) => {
  const value = valid(y, m, d);
  return value ? { value } : { error: 'That date does not exist — please check it.' };
};

/**
 * @param {string} input free-typed date
 * @returns {{ value: string } | { error: string } | null} null for empty input
 */
export function parseFlexibleDate(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;

  // ISO-like: 1953-05-14 / 1953/5/14 / 1953.05.14
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return checked(+m[1], +m[2], +m[3]);

  // Month written out, either order: "14 May 1953" / "May 14, 1953"
  m =
    s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/) ||
    s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const first = m[1];
    const second = m[2];
    const y = +m[3];
    const day = Number.isNaN(+first) ? +second : +first;
    const monthWord = (Number.isNaN(+first) ? first : second).toLowerCase();
    const month = MONTHS[monthWord.slice(0, 4)] ?? MONTHS[monthWord.slice(0, 3)];
    if (!month) return { error: "We couldn't read the month — try like 14 May 1953." };
    return checked(y, month, day);
  }

  // Numeric day-first / month-first: only when unambiguous (one part > 12)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12 && b <= 12) return checked(y, b, a); // day first
    if (b > 12 && a <= 12) return checked(y, a, b); // month first
    if (a > 12 && b > 12) return { error: 'That date does not exist — please check it.' };
    return { error: 'That date reads two ways — please write the month, like 14 May 1953.' };
  }

  return { error: "We couldn't read that date — try like 1953-05-14 or 14 May 1953." };
}
