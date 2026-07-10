// Ported verbatim from ToWin/frontend/src/pages/ElderDashboard.jsx —
// plain everyday words (elder-first), same status copy, same ordering.
export const CATEGORY = {
  COMPANIONSHIP: 'Company',
  TRANSPORTATION: 'Rides',
  ERRANDS: 'Shopping',
  CLEANING: 'Cleaning',
  OTHER: 'Other',
};

export const catLabel = (c) => CATEGORY[c] || c;

// Status pill roles reference theme token NAMES; cards resolve them via useTheme.
export const NEED_STATUS = {
  OPEN: { label: 'Looking for Help', color: 'inkSlate', bg: 'chipNeutral' },
  ASSIGNED: { label: 'Helper Found', color: 'blueDeep', bg: 'blueTint' },
  COMPLETED: { label: 'Completed', color: 'greenDeep', bg: 'greenTint' },
  CANCELLED: { label: 'Cancelled', color: 'inkSlate', bg: 'surface2' },
};

const NEED_STATUS_ORDER = { OPEN: 0, ASSIGNED: 1, COMPLETED: 2, CANCELLED: 3 };

export const sortNeeds = (a, b) => {
  const aS = NEED_STATUS_ORDER[a.status] ?? 4;
  const bS = NEED_STATUS_ORDER[b.status] ?? 4;
  if (aS !== bS) return aS - bS;
  if (a.status === 'OPEN' && b.status === 'OPEN') {
    const aU = a.urgency === 'URGENT' ? 0 : 1;
    const bU = b.urgency === 'URGENT' ? 0 : 1;
    return aU - bU;
  }
  return 0;
};
