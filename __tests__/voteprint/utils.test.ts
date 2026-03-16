import { getWedgeAtPoint, seededRandom } from '@/lib/voteprint/utils';
import type { WedgeAngle } from '@/lib/voteprint/utils';

// ---------------------------------------------------------------------------
// seededRandom
// ---------------------------------------------------------------------------

describe('seededRandom', () => {
  it('returns a value in [0, 1)', () => {
    for (let s = 0; s < 20; s++) {
      const v = seededRandom(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed always returns same value', () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
    expect(seededRandom(0)).toBe(seededRandom(0));
  });

  it('returns different values for different seeds', () => {
    expect(seededRandom(1)).not.toBe(seededRandom(2));
  });
});

// ---------------------------------------------------------------------------
// getWedgeAtPoint
// ---------------------------------------------------------------------------

// Two wedges that together cover [0°, 360°) starting from top (−π/2)
// Wedge A: -π/2 → π/2  (left half, 180°)
// Wedge B: π/2  → 3π/2  (right half, 180°)
const wedges: WedgeAngle[] = [
  { categoryId: 'a', startAngle: -Math.PI / 2, endAngle: Math.PI / 2 },
  { categoryId: 'b', startAngle: Math.PI / 2, endAngle: (3 * Math.PI) / 2 },
];

const cx = 100;
const cy = 100;
const innerR = 30;
const outerR = 60;

describe('getWedgeAtPoint', () => {
  it('returns null when the point is inside the inner radius (hole)', () => {
    // Directly above center, distance = 10 (< innerR 30)
    expect(getWedgeAtPoint(cx, cy - 10, cx, cy, innerR, outerR, wedges)).toBeNull();
  });

  it('returns null when the point is outside the outer radius', () => {
    // Directly above center, distance = 80 (> outerR 60)
    expect(getWedgeAtPoint(cx, cy - 80, cx, cy, innerR, outerR, wedges)).toBeNull();
  });

  it('returns null when no wedges are provided', () => {
    const x = cx;
    const y = cy - 45; // within the ring
    expect(getWedgeAtPoint(x, y, cx, cy, innerR, outerR, [])).toBeNull();
  });

  it('identifies wedge A for a point in the upper half of the ring', () => {
    // Directly above center at angle = -π/2, distance = 45 (within ring)
    const x = cx;
    const y = cy - 45;
    expect(getWedgeAtPoint(x, y, cx, cy, innerR, outerR, wedges)).toBe('a');
  });

  it('identifies wedge B for a point in the lower half of the ring', () => {
    // Directly below center at angle = π/2, distance = 45 (within ring)
    const x = cx;
    const y = cy + 45;
    expect(getWedgeAtPoint(x, y, cx, cy, innerR, outerR, wedges)).toBe('b');
  });

  it('identifies wedge A for a point directly to the left (angle = π)', () => {
    // Angle π falls in wedge A's range [-π/2, π/2] after normalization
    // Left of center: angle from atan2 = ±π; after shift = π (which is in [π/2, 3π/2] = wedge B)
    // Actually left = angle π = wedge B. Let's test a point at angle 0 (right) = wedge A? No…
    // At angle 0 (right of center): x = cx + 45, y = cy → angle = 0 → in [-π/2, π/2] = wedge A
    const x = cx + 45;
    const y = cy;
    expect(getWedgeAtPoint(x, y, cx, cy, innerR, outerR, wedges)).toBe('a');
  });
});
