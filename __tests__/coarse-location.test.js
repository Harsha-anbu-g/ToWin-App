// A phone fix must never leave the device at street resolution.
//
// The threat this defends: /discover takes a caller-supplied lat/lng and
// returns distances rounded to 0.1 km, so three calls from one ordinary
// account trilaterate any member's stored position to roughly 100 m. The
// backend is read-only from this repo, so snapping on the device is the whole
// defence, and these tests are what stop a later edit from quietly removing it.
import { GRID_DEGREES, cellSizeKm, coarsen } from '../src/lib/coarseLocation';

describe('coarsening a phone fix', () => {
  test('a street-level fix is snapped to the grid', () => {
    // Arrange — a real Montreal doorstep
    const fix = { latitude: 45.50169, longitude: -73.56727 };
    // Act
    const out = coarsen(fix);
    // Assert — two decimals, and both on a 0.02 boundary
    expect(out.locationLat).toBe(45.5);
    expect(out.locationLng).toBe(-73.56);
    for (const v of [out.locationLat, out.locationLng]) {
      expect(Math.abs(Math.round(v / GRID_DEGREES) * GRID_DEGREES - v)).toBeLessThan(1e-9);
    }
  });

  test('two doorsteps a few streets apart collapse onto the same point', () => {
    // ~250 m apart: the resolution an attacker must not be able to recover.
    const a = coarsen({ latitude: 45.50169, longitude: -73.56727 });
    const b = coarsen({ latitude: 45.50361, longitude: -73.56912 });
    expect(a).toEqual(b);
  });

  test('places a few kilometres apart still land on different points', () => {
    // The feature has to keep working: this is the whole reason for real GPS.
    const downtown = coarsen({ latitude: 45.5019, longitude: -73.5674 });
    const farther = coarsen({ latitude: 45.5601, longitude: -73.6103 });
    expect(downtown).not.toEqual(farther);
  });

  test('never emits more than two decimal places', () => {
    // Apple treats three or more decimals as Precise Location; staying at two
    // is what keeps the existing store answers true.
    for (const lat of [45.50169, -33.86882, 12.97194, 0.000001, 89.99999]) {
      for (const lng of [-73.56727, 151.20929, 77.59369, -0.127758, 179.99999]) {
        const out = coarsen({ latitude: lat, longitude: lng });
        for (const v of [out.locationLat, out.locationLng]) {
          const decimals = (String(v).split('.')[1] || '').length;
          expect(decimals).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  test('the cell stays coarser than both stores’ precise-location lines', () => {
    // Google Play calls anything finer than 3 sq km "precise".
    for (const latitude of [0, 12.97, 28.61, 40.71, 45.5, 51.5]) {
      const { areaSqKm } = cellSizeKm(latitude);
      expect(areaSqKm).toBeGreaterThan(3);
    }
  });

  test('the cell stays fine enough for a 5 km filter to mean something', () => {
    // If the cell approached 5 km the narrowest bucket would be noise.
    for (const latitude of [0, 45.5]) {
      const { northSouth, eastWest } = cellSizeKm(latitude);
      expect(Math.max(northSouth, eastWest)).toBeLessThan(2.5);
    }
  });

  test('a missing or unusable fix returns null rather than a guess', () => {
    expect(coarsen(undefined)).toBeNull();
    expect(coarsen(null)).toBeNull();
    expect(coarsen({})).toBeNull();
    expect(coarsen({ latitude: 45.5 })).toBeNull();
    expect(coarsen({ latitude: NaN, longitude: 3 })).toBeNull();
    expect(coarsen({ latitude: '45.5', longitude: '-73.5' })).toBeNull();
  });

  test('an out-of-range reading is refused, never clamped', () => {
    // The backend validates @Min(-90)/@Max(90); a clamp would send a real
    // coordinate the person is not at.
    expect(coarsen({ latitude: 91, longitude: 0 })).toBeNull();
    expect(coarsen({ latitude: 0, longitude: 181 })).toBeNull();
    expect(coarsen({ latitude: -90.1, longitude: 0 })).toBeNull();
  });

  test('the equator and the prime meridian survive the round trip', () => {
    expect(coarsen({ latitude: 0, longitude: 0 })).toEqual({ locationLat: 0, locationLng: 0 });
  });
});
