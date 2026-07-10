// Ported verbatim from ToWin/frontend/src/pages/Streaks.jsx.
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

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
