// Rounding a phone fix down to something safe to send.
//
// Why this exists at all: /discover accepts a latitude and longitude from
// whoever calls it and answers with distances rounded to 0.1 km
// (DiscoveryService returns Math.round(distanceKm * 10) / 10). Three calls
// from one ordinary account trilaterate any member's stored position to about
// 100 metres. Today that only resolves a town centre, because a town is all
// anybody has stored. The moment a real GPS fix is stored, the same three
// calls resolve an elderly person's front door. The backend belongs to the
// website and is read-only from here, so the only place that can be defended
// is before the coordinate leaves the phone.
//
// So every fix is snapped to a fixed grid before it reaches the network. The
// cell is 0.02 degrees:
//   north-south   0.02 * 111.32 km            = 2.23 km, everywhere
//   east-west     0.02 * 111.32 * cos(lat) km = 2.20 km at the equator,
//                                               1.72 km at Montreal (39.5N is
//                                               1.72; 45.5N is 1.56)
// so a cell covers roughly 3.5 to 4.9 sq km. That sits above Google Play's
// 3 sq km line for "approximate", and two decimal places sits below Apple's
// three-decimal line for "Precise Location", so both stores' existing answers
// (coarse, app functionality, linked, not used for tracking) stay true and no
// store paperwork changes.
//
// What the owner will see, and should not be surprised by: two people inside
// one cell come back 0.0 km apart and their card shows a town instead of a
// number, while two people 3 km apart now land in different cells and read
// "3 km". That is the whole improvement, measured against a live API that
// today answers 0.0, 0.0, 0.1, 0.3, 0.4 for everybody in one town.

/** Degrees per grid cell. Do not raise without re-checking the store lines above. */
export const GRID_DEGREES = 0.02;

/** Kilometres per degree of latitude (WGS-84 mean). */
const KM_PER_DEGREE = 111.32;

const snap = (value) => Math.round(value / GRID_DEGREES) * GRID_DEGREES;

// 0.02 has no exact binary form, so Math.round(x / 0.02) * 0.02 lands on
// values like 45.480000000000004. Two decimals is exactly the grid's
// resolution and is also what keeps the payload under Apple's precise-location
// line, so the fix is the rounding itself rather than cosmetic.
const toGrid = (value) => Number(snap(value).toFixed(2));

/**
 * Snap one fix to the grid. Returns null for anything that is not a usable
 * pair of numbers, so a caller can treat "no position" and "bad position"
 * the same way.
 * @param {{ latitude?: number, longitude?: number }} coords
 */
export function coarsen(coords) {
  const lat = coords?.latitude;
  const lng = coords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Out-of-range values would be rejected by the backend's @Min/@Max anyway;
  // refusing here keeps a bad reading from ever reaching the wire.
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { locationLat: toGrid(lat), locationLng: toGrid(lng) };
}

/**
 * The worst-case error the grid introduces, in km, at a given latitude. Used
 * by the tests to prove the cell stays inside the store thresholds, and by the
 * copy that tells a person how exact their saved position is.
 */
export function cellSizeKm(latitude = 0) {
  const northSouth = GRID_DEGREES * KM_PER_DEGREE;
  const eastWest = GRID_DEGREES * KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
  return { northSouth, eastWest, areaSqKm: northSouth * eastWest };
}
