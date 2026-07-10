// Ported from ToWin/frontend/src/pages/Register.jsx — same scoring and the
// same input sanitizing so mobile and web accept identical usernames.
export const pwdStrength = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
};

export const sanitizeUsername = (v) => v.toLowerCase().replace(/[^a-z0-9_]/g, '');

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
