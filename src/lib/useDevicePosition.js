// The one way a screen asks this phone where it is.
//
// Add Friends used to be the only screen that ever asked, with its own
// useState/useEffect block. Four screens now need the same ask, and four copies
// of that block would be four chances to call requestPermission() somewhere it
// does not belong. iOS shows its system prompt ONCE per install: spend it on a
// screen that has not explained itself and the refusal cannot be undone from
// inside the app.
//
// So the rules live here, once:
//   - mounting reads the state WITHOUT prompting
//   - enable() is the only thing in the app that may reach requestPermission,
//     and screens only call it from the tap handler of the shared card
//   - nothing throws; every failure resolves to a state a card can render
//   - the phone keeps its own record of what it saved, because the API cannot
//     be asked (ProfileResponse has `city` and no coordinates, and
//     PUT /profile/location returns Void)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  STATUS,
  currentStatus,
  enableAndSave,
  readSavedPosition,
  refreshSavedPosition,
} from './deviceLocation';

/**
 * How old a saved position may be before it is worth reading again. A day.
 * A position from six months ago is worse than none: it tells a helper a
 * distance that stopped being true.
 */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * @returns {{
 *   status: string|null, busy: boolean, hasPosition: boolean,
 *   position: {locationLat: number, locationLng: number}|null,
 *   savedAt: number|null, isStale: boolean,
 *   enable: () => Promise<string>, refresh: () => Promise<object|null>,
 *   dismissed: boolean, dismiss: () => void,
 * }} status is null until the first read lands, so a card can wait rather
 * than flashing the wrong state at somebody.
 */
export default function useDevicePosition() {
  const { user } = useAuth();
  const userId = user?.userId;

  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Every await below can outlive the screen an elder just swiped away from.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Read-only on mount. Nothing here can raise a system dialog.
  useEffect(() => {
    let live = true;
    Promise.all([currentStatus(), readSavedPosition(userId)]).then(([nextStatus, saved]) => {
      if (!live) return;
      setStatus(nextStatus);
      setRecord(saved);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  /** The one call in the app that may prompt. Only from a tap on our own card. */
  const enable = useCallback(async () => {
    setBusy(true);
    const { status: next } = await enableAndSave(userId);
    // The record is the source of truth for "has a position", because it is
    // written only when the PUT came back clean.
    const saved = next === STATUS.allowed ? await readSavedPosition(userId) : null;
    if (alive.current) {
      setStatus(next);
      // A failed save leaves whatever was already known; a stale position beats
      // wiping the screen's distances because one refresh did not land.
      if (saved) setRecord(saved);
      setBusy(false);
    }
    return next;
  }, [userId]);

  /** Read again without prompting. Refuses unless permission is already granted. */
  const refresh = useCallback(async () => {
    if (status !== STATUS.allowed) return null;
    setBusy(true);
    await refreshSavedPosition(userId);
    const saved = await readSavedPosition(userId);
    if (alive.current) {
      if (saved) setRecord(saved);
      setBusy(false);
    }
    return saved;
  }, [status, userId]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const position = useMemo(
    () => (record ? { locationLat: record.locationLat, locationLng: record.locationLng } : null),
    [record]
  );

  return {
    status,
    busy,
    hasPosition: !!record,
    position,
    savedAt: record?.savedAt ?? null,
    isStale: !record || Date.now() - record.savedAt > STALE_AFTER_MS,
    enable,
    refresh,
    dismissed,
    dismiss,
  };
}
