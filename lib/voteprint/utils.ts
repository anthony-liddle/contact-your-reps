/**
 * Pure utility functions shared across Voteprint UI components.
 * No side effects, no imports from other voteprint modules — safe to use in
 * both server and client contexts.
 */

/**
 * High-contrast category colors.
 * Values chosen to pass WCAG AA on dark backgrounds (canvas, dark-mode legend)
 * and to be used as solid chip backgrounds with #0f172a text in the vote list.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  'universal-healthcare': '#818CF8',
  'climate-justice': '#4ADE80',
  'police-violence': '#60A5FA',
  'trans-rights': '#34D399',
  'immigration-abolish-ice': '#A78BFA',
  'workers-rights': '#FCD34D',
  'housing-as-a-right': '#FBBF24',
  'student-debt': '#F472B6',
  'voting-rights-democracy': '#2DD4BF',
  'foreign-policy': '#94A3B8',
  'corporate-power': '#FB923C',
  'reproductive-justice': '#E879F9',
  'queer-rights': '#F87171',
  'disability-rights': '#67E8F9',
  'racial-justice': '#FCA5A5',
  'indigenous-sovereignty': '#86EFAC',
  'surveillance-digital-rights': '#C4B5FD',
  'drug-decriminalization': '#FDE68A',
  'food-sovereignty': '#6EE7B7',
};

/** Human-readable label for each category id. */
export const CATEGORY_LABELS: Record<string, string> = {
  'universal-healthcare': 'Universal Healthcare',
  'climate-justice': 'Climate Justice',
  'police-violence': 'Police Violence',
  'trans-rights': 'Trans Rights',
  'immigration-abolish-ice': 'Immigration / Abolish ICE',
  'workers-rights': "Workers' Rights",
  'housing-as-a-right': 'Housing as a Right',
  'student-debt': 'Student Debt',
  'voting-rights-democracy': 'Voting Rights & Democracy',
  'foreign-policy': 'Foreign Policy',
  'corporate-power': 'Corporate Power',
  'reproductive-justice': 'Reproductive Justice',
  'queer-rights': 'Queer Rights',
  'disability-rights': 'Disability Rights',
  'racial-justice': 'Racial Justice',
  'indigenous-sovereignty': 'Indigenous Sovereignty',
  'surveillance-digital-rights': 'Surveillance & Digital Rights',
  'drug-decriminalization': 'Drug Decriminalization',
  'food-sovereignty': 'Food Sovereignty',
};

/**
 * Deterministic pseudo-random number in [0, 1) for a given integer seed.
 * Uses Math.sin to avoid any runtime dependency on a PRNG library while
 * staying stable across re-renders for the same seed value.
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Describes the angular span of a single category wedge on the canvas. */
export interface WedgeAngle {
  categoryId: string;
  startAngle: number; // radians
  endAngle: number; // radians
}

/**
 * Returns the category id of the wedge at canvas point (x, y), or null if the
 * point falls outside the donut ring or between wedges.
 *
 * @param x        - Click x relative to the canvas element
 * @param y        - Click y relative to the canvas element
 * @param cx       - Canvas center x
 * @param cy       - Canvas center y
 * @param innerR   - Inner radius of the donut
 * @param outerR   - Outer radius of the donut
 * @param wedges   - Array of wedge descriptors built by the canvas drawing code
 */
export function getWedgeAtPoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  wedges: WedgeAngle[],
): string | null {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < innerR || dist > outerR) return null;

  // atan2 returns [-π, π]; normalize to [startAngle, startAngle + 2π] window
  // used by the wedges (they start at -π/2)
  let angle = Math.atan2(dy, dx);
  // Shift into [-π/2, 3π/2] to align with wedges starting at -π/2
  if (angle < -Math.PI / 2) angle += 2 * Math.PI;

  for (const wedge of wedges) {
    if (angle >= wedge.startAngle && angle < wedge.endAngle) {
      return wedge.categoryId;
    }
  }

  return null;
}
