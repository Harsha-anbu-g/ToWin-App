// Daily check-in streaks as named tools (project Rule 6): one exported
// function per action, plain inputs, plain outputs, no UI knowledge.
import api from './client';

/**
 * The signed-in elder's check-in streak: current run, longest run ever, last
 * check-in date, and whether today's check-in is already done.
 * @returns {Promise<{currentStreak: number, longestStreak: number, lastCheckinDate: string|null, alreadyCheckedIn: boolean}>}
 */
export async function getMyStreak() {
  const res = await api.get('/streaks/me');
  return res?.data;
}

/**
 * Record today's check-in and return the updated streak. Safe to repeat: a
 * same-day repeat returns alreadyCheckedIn=true instead of an error, so an
 * exception here means the check-in genuinely failed.
 * @returns {Promise<{currentStreak: number, longestStreak: number, lastCheckinDate: string|null, alreadyCheckedIn: boolean}>}
 */
export async function checkInToday() {
  const res = await api.post('/streaks/checkin');
  return res?.data;
}
