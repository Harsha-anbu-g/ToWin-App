// Ported verbatim from Towinly/frontend/src/pages/Streaks.jsx.
// Build the Monday–Sunday week containing today, marking which days fall inside
// the current consecutive streak. Derived from currentStreak + lastCheckinDate
// since the backend keeps no per-day history.
export function buildWeek(streak, now = new Date()) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7; // days since Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const current = streak?.currentStreak ?? 0;
  const last = streak?.lastCheckinDate ? new Date(`${streak.lastCheckinDate}T00:00:00`) : null;
  let runStart = null;
  if (last && current > 0) {
    runStart = new Date(last);
    runStart.setDate(last.getDate() - (current - 1));
  }

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isFuture = d > today;
    const isToday = d.getTime() === today.getTime();
    const done = !!(runStart && last && d >= runStart && d <= last && !isFuture);
    return { label, done, today: isToday && !done, future: isFuture };
  });
}

// Ported verbatim from Towinly/frontend/src/pages/Streaks.jsx: age from date
// of birth — total days lived plus a years/months/days breakdown. Returns
// null without a date of birth. `now` is injectable for tests only.
export function computeAge(dobStr, now = new Date()) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);

  const totalDays = Math.floor((now - dob) / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { totalDays, years, months, days };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
