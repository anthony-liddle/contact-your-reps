# Voteprint — Stance-Aware Encoding, Clean URLs, RepHeader Enhancements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stance-aware vote encoding, simplify rep page URLs, upgrade RepHeader with full rep info, and replace quadratic curves with straight lines in the voteprint canvas.

**Architecture:** Changes flow bottom-up through the data layer: `vote-mappings.json` gains `stance`, `Vote` type gains `alignedWithIssue`, `enrichWithCategory` derives it, then canvas and VoteList consume it. URL/sessionStorage changes are independent of the data layer and can be done in either order. RepHeader becomes a client component reading from sessionStorage.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React, CSS Modules, Jest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-15-voteprint-stance-and-ux-design.md`

---

## Files Changed

| File | Change |
|------|--------|
| `data/vote-mappings.json` | Add `stance` to all 84 entries (after deleting `119-house-340` from 85) |
| `lib/voteprint/types.ts` | Add `alignedWithIssue: boolean \| null` to `Vote` |
| `lib/voteprint/voteMappings.ts` | Add `stance` to `VoteMappingEntry`; update `enrichWithCategory` |
| `lib/voteprint/transformVotes.ts` | Pass normalized `position` to `enrichWithCategory`; spread `alignedWithIssue` |
| `components/Voteprint/Voteprint.tsx` | Straight lines; spoke encoding via `alignedWithIssue`; update file header |
| `components/VoteList/VoteList.tsx` | Alignment tags; stance-aware banner text |
| `components/VoteList/VoteList.module.css` | `tagAligned`, `tagOpposed` styles |
| `components/RepHeader/RepHeader.tsx` | `'use client'`; SSR fallback; sessionStorage on mount; photo, phone, website |
| `components/RepHeader/RepHeader.module.css` | Phone link, website link, fallback notice styles |
| `components/RepresentativeCard.tsx` | Simplified href; `onClick` sessionStorage write |
| `app/rep/[bioguideId]/page.tsx` | Remove display searchParams; minimal props to RepHeader; update comment |
| `scripts/map-votes.ts` | Add `stance` to prompt and response shape |
| `scripts/apply-mappings.ts` | Write `stance` when merging suggestions |
| `__tests__/voteprint/enrichWithCategory.test.ts` | Add `position` arg; add 7 stance matrix tests |
| `__tests__/voteprint/VoteList.test.tsx` | Add `alignedWithIssue: null` to `makeVote`; new alignment + banner tests |
| `__tests__/voteprint/Voteprint.test.tsx` | Add `alignedWithIssue: null` to `makeVote` |
| `__tests__/components/RepresentativeCard.test.tsx` | New URL shape + sessionStorage tests |
| `__tests__/components/RepHeader.test.tsx` | New file: fallback/populated/photo tests |

---

## Chunk 1: Data Foundation

### Task 1: Add alignedWithIssue to Vote type and update makeVote factories

**Files:**
- Modify: `lib/voteprint/types.ts`
- Modify: `__tests__/voteprint/VoteList.test.tsx`
- Modify: `__tests__/voteprint/Voteprint.test.tsx`

The interface must be updated first — factories reference it. After the type change, the factory objects will be missing the field and TypeScript will surface compile errors, which we fix in the following steps.

- [ ] **Step 1: Add `alignedWithIssue: boolean | null` to the Vote interface**

In `lib/voteprint/types.ts`, add after the `note` field:

```typescript
  /** Optional human-readable note from vote-mappings.json. */
  note: string;
  /**
   * Whether the member's vote aligned with the progressive issue position.
   * true  = vote aligned with the issue
   * false = vote opposed the issue
   * null  = unmapped, absent, or stance unknown
   */
  alignedWithIssue: boolean | null;
```

- [ ] **Step 2: Add `alignedWithIssue: null` to makeVote in VoteList.test.tsx**

In `__tests__/voteprint/VoteList.test.tsx`, update `makeVote`:

```typescript
function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    congress: 119,
    chamber: 'House',
    session: 1,
    rollCall: 1,
    date: '2025-01-15',
    question: 'On Passage',
    description: '',
    result: 'passed',
    voteType: 'Yea-and-Nay',
    bill: null,
    position: 'yea',
    partyMajority: 'yea',
    isPartyBreak: false,
    category: null,
    note: '',
    alignedWithIssue: null,   // ← add this line
    ...overrides,
  };
}
```

- [ ] **Step 3: Add `alignedWithIssue: null` to makeVote in Voteprint.test.tsx**

In `__tests__/voteprint/Voteprint.test.tsx`, same change to `makeVote`:

```typescript
function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    congress: 119,
    chamber: 'House',
    session: 1,
    rollCall: 1,
    date: '2025-01-15',
    question: 'On Passage',
    description: '',
    result: 'passed',
    voteType: 'Yea-and-Nay',
    bill: null,
    position: 'yea',
    partyMajority: 'yea',
    isPartyBreak: false,
    category: 'climate-justice',
    note: '',
    alignedWithIssue: null,   // ← add this line
    ...overrides,
  };
}
```

- [ ] **Step 4: Run tests — expect a TypeScript compile error in transformVotes.ts only**

```bash
pnpm run test -- --testPathPattern="VoteList|Voteprint.test" 2>&1 | head -40
```

Expected: `ts-jest` reports a **TypeScript compile error** in `lib/voteprint/transformVotes.ts` — the return object literal is missing `alignedWithIssue`. The test files themselves should now compile cleanly. This error is expected and will be fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add lib/voteprint/types.ts __tests__/voteprint/VoteList.test.tsx __tests__/voteprint/Voteprint.test.tsx
git commit -m "feat(voteprint): add alignedWithIssue field to Vote type and update test factories"
```

---

### Task 2: Add stance field to vote-mappings.json

**Files:**
- Modify: `data/vote-mappings.json`

This is a pure data change. The full mapping is documented in the spec (`docs/superpowers/specs/2026-03-15-voteprint-stance-and-ux-design.md`, Section 4a). The file currently has 85 entries; after deleting `119-house-340` it will have 84.

- [ ] **Step 1: Delete `119-house-340` entry from vote-mappings.json**

Find and remove the entire `"119-house-340"` key and its value object. The Kayla Hamilton Act entry is being removed entirely (misidentified category — not replaced).

- [ ] **Step 2: Add stance field to all remaining entries**

Using the stance table in Section 4a of the spec, add `"stance": "for"` or `"stance": "against"` to every entry. Entries with uncertain stance get `(stance: review)` appended to their `note` field. **Important:** the `stance` field value is always the plain string `"for"` or `"against"` — never `"against (stance: review)"`. The `(stance: review)` marker goes in `note` only, not in `stance`. Example format:

```json
"119-house-6": {
  "category": "immigration-abolish-ice",
  "stance": "against",
  "note": "Laken Riley Act — mandatory detention of undocumented immigrants"
},
"119-house-132": {
  "category": "foreign-policy",
  "stance": "against",
  "note": "Strengthen Quad military alliance (stance: review)"
}
```

Full stance assignments per spec Section 4a — apply them all. The `(stance: review)` suffix goes in the `note` for these entries: 119-house-132, 119-house-172, 119-house-191, 119-house-196, 119-house-275, 119-house-287, 119-house-307, 119-house-331, 119-house-332, 119-house-349.

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./data/vote-mappings.json'); console.log('JSON valid')"
```

Expected: `JSON valid`

- [ ] **Step 4: Verify entry count**

```bash
node -e "const m = require('./data/vote-mappings.json'); console.log(Object.keys(m).length + ' entries')"
```

Expected: `84 entries` (was 85, deleted one)

- [ ] **Step 5: Run existing enrichWithCategory tests to verify JSON structure is intact**

```bash
pnpm run test -- --testPathPattern="enrichWithCategory"
```

Expected: All existing 8 tests PASS. The `enrichWithCategory` signature has not changed yet (Task 3 adds the `position` argument), so no argument mismatch occurs here. Any failure at this stage is a JSON structural problem (parse error, missing category lookup) — investigate the JSON before continuing.

- [ ] **Step 6: Commit**

```bash
git add data/vote-mappings.json
git commit -m "feat(data): add stance field to vote-mappings.json (84 entries)"
```

---

### Task 3: Update enrichWithCategory tests for new signature and stance matrix

> **Prerequisites:** Task 2 must be committed before this task. The stance matrix tests reference specific roll call numbers and assume their `stance` values are already in `data/vote-mappings.json`.

**Files:**
- Modify: `__tests__/voteprint/enrichWithCategory.test.ts`

Write the failing tests first. All existing tests need a second argument (`position`) added to each `enrichWithCategory(...)` call. Then add 8 new stance matrix + note-stripping tests.

- [ ] **Step 1: Write failing tests — add position arg to all existing calls**

In `__tests__/voteprint/enrichWithCategory.test.ts`, update all `enrichWithCategory(makeRaw(...))` calls to `enrichWithCategory(makeRaw(...), 'yea')`.

```typescript
it('returns the correct category for a known mapping (119-house-240)', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
  expect(result.category).toBe('student-debt');
});

it('returns a non-empty note for a known mapping', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
  expect(result.note.length).toBeGreaterThan(0);
});

it('returns null category for an unknown roll call number', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
  expect(result.category).toBeNull();
});

it('returns empty string note for an unknown roll call', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
  expect(result.note).toBe('');
});

it('resolves correctly for a different known mapping (119-house-96 → foreign-policy)', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 96 }), 'yea');
  expect(result.category).toBe('foreign-policy');
});

it('resolves correctly for a climate-justice mapping (119-house-245)', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'yea');
  expect(result.category).toBe('climate-justice');
});

it('resolves senate chamber votes separately from house votes of the same roll call', () => {
  const houseResult = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
  expect(houseResult.category).toBe('student-debt');

  const unknownResult = enrichWithCategory(makeRaw({ rollCall: 241 }), 'yea');
  expect(unknownResult.category).toBeNull();
});

it('resolves correctly for workers-rights mapping (119-house-122)', () => {
  const result = enrichWithCategory(makeRaw({ rollCall: 122 }), 'yea');
  expect(result.category).toBe('workers-rights');
});
```

- [ ] **Step 2: Add 8 new stance matrix + note-stripping tests**

Append after the existing describe block. Roll call 240 has `stance: "against"` (per Task 2 data changes); roll call 245 has `stance: "for"`. Roll call 132 has `(stance: review)` in its note and is used to verify stripping.

```typescript
describe('enrichWithCategory — stance matrix', () => {
  // 119-house-240 has stance: "against" (eliminate student loan forgiveness)
  it('stance against + yea → alignedWithIssue false', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
    expect(result.alignedWithIssue).toBe(false);
  });

  it('stance against + nay → alignedWithIssue true', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'nay');
    expect(result.alignedWithIssue).toBe(true);
  });

  // 119-house-245 has stance: "for" (restores EPA methane reporting)
  it('stance for + yea → alignedWithIssue true', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'yea');
    expect(result.alignedWithIssue).toBe(true);
  });

  it('stance for + nay → alignedWithIssue false', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'nay');
    expect(result.alignedWithIssue).toBe(false);
  });

  it('stance against + absent → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'absent');
    expect(result.alignedWithIssue).toBeNull();
  });

  it('stance for + absent → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'absent');
    expect(result.alignedWithIssue).toBeNull();
  });

  it('no mapping → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
    expect(result.alignedWithIssue).toBeNull();
  });

  // 119-house-132 has "(stance: review)" appended to its note in the JSON
  it('strips the (stance: review) suffix from note before returning', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 132 }), 'yea');
    expect(result.note).not.toMatch(/\(stance: review\)/);
    expect(result.note.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail as expected**

```bash
pnpm run test -- --testPathPattern="enrichWithCategory" 2>&1 | tail -20
```

Expected: FAIL — `enrichWithCategory` does not yet accept a second argument and does not return `alignedWithIssue`. The failure should be a TypeScript compile error (wrong argument count), not a JSON parse error — if you see JSON errors, Task 2 was not committed first.

- [ ] **Step 4: Update enrichWithCategory implementation**

In `lib/voteprint/voteMappings.ts`:

1. Add `stance` to `VoteMappingEntry`:

```typescript
interface VoteMappingEntry {
  category: VoteCategory;
  note: string;
  stance: 'for' | 'against';
}
```

2. Update `enrichWithCategory` signature, return type, and derivation:

```typescript
export function enrichWithCategory(
  vote: RawCongressVote,
  position: Vote['position'],
): Pick<Vote, 'category' | 'note' | 'alignedWithIssue'> {
  const key = buildMappingKey(vote);
  const entry = voteMappings[key];

  if (!entry) {
    return { category: null, note: '', alignedWithIssue: null };
  }

  const note = entry.note.replace(/ \(stance: review\)$/, '');

  let alignedWithIssue: boolean | null = null;
  if (position !== 'absent') {
    if (entry.stance === 'for') {
      alignedWithIssue = position === 'yea';
    } else {
      alignedWithIssue = position === 'nay';
    }
  }

  return { category: entry.category, note, alignedWithIssue };
}
```

- [ ] **Step 5: Run tests — expect enrichWithCategory tests to pass**

```bash
pnpm run test -- --testPathPattern="enrichWithCategory"
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/voteprint/voteMappings.ts __tests__/voteprint/enrichWithCategory.test.ts
git commit -m "feat(voteprint): stance-aware enrichWithCategory with alignedWithIssue derivation"
```

---

### Task 4: Thread alignedWithIssue through transformVotes

**Files:**
- Modify: `lib/voteprint/transformVotes.ts`
- Modify: `__tests__/voteprint/transformVotes.test.ts`

- [ ] **Step 1: Write a failing integration test in transformVotes.test.ts**

In `__tests__/voteprint/transformVotes.test.ts`, add a new describe block to test `alignedWithIssue` at the pipeline level. Roll call 245 (`climate-justice`, `stance: "for"`) is used because it's a real mapped entry.

```typescript
describe('transformVotes — alignedWithIssue field', () => {
  // Roll call 245 is mapped with stance: "for" (restores EPA methane reporting)
  it('produces alignedWithIssue true for a "for"-stance vote with Yea position', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Yea' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBe(true);
  });

  it('produces alignedWithIssue false for a "for"-stance vote with Nay position', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Nay' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBe(false);
  });

  it('produces alignedWithIssue null for an unmapped vote', () => {
    // Roll call 99999 is not in the mappings
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 99999, memberVote: 'Yea' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBeNull();
  });

  it('produces alignedWithIssue null for an absent vote on a mapped roll call', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Not Voting' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
pnpm run test -- --testPathPattern="transformVotes"
```

Expected: TypeScript compile error — `transformVotes` return object missing `alignedWithIssue`.

- [ ] **Step 3: Update the enrichWithCategory call and spread alignedWithIssue**

In `lib/voteprint/transformVotes.ts`, find the call to `enrichWithCategory` and update:

```typescript
const position = normalizePosition(raw.memberVote);
const result = normalizeResult(raw.result);
const partyMajority = derivePartyMajority(raw.partyTotals, party);
const { category, note, alignedWithIssue } = enrichWithCategory(raw, position);
```

Then spread `alignedWithIssue` into the returned object:

```typescript
return {
  congress: raw.congress,
  chamber: raw.chamber,
  session: raw.session,
  rollCall: raw.rollCall,
  date: raw.date,
  question: raw.question,
  description: raw.description,
  result,
  voteType: raw.voteType,
  bill: raw.bill,
  position,
  partyMajority,
  isPartyBreak,
  category,
  note,
  alignedWithIssue,   // ← add this line
};
```

- [ ] **Step 4: Run full test suite to verify no regressions**

```bash
pnpm run test
```

Expected: All tests PASS. The new `transformVotes` integration tests (Task 4 Step 1) should now pass, as should VoteList and Voteprint tests whose factories already have `alignedWithIssue: null`.

- [ ] **Step 5: Commit**

```bash
git add lib/voteprint/transformVotes.ts __tests__/voteprint/transformVotes.test.ts
git commit -m "feat(voteprint): thread alignedWithIssue through transformVotes"
```

---

## Chunk 2: Canvas and VoteList

> **Prerequisites:** Chunk 1 (Tasks 1–4) must be complete before starting this chunk. Task 7 in particular requires the `alignedWithIssue` field to be present on the `Vote` type and in the `makeVote` factory in `VoteList.test.tsx` — both added in Task 1.

### Task 5: Replace quadratic curves with straight lines in canvas

**Files:**
- Modify: `components/Voteprint/Voteprint.tsx`

- [ ] **Step 1: Remove r3 and quadratic curve code, replace with lineTo**

In `Voteprint.tsx`, in the vote-line drawing loop, replace:

```typescript
const r1 = seededRandom(vote.rollCall * 31 + 7);
const r2 = seededRandom(vote.rollCall * 31 + 13);
const r3 = seededRandom(vote.rollCall * 31 + 19);

const voteAngle = wedge.startAngle + r1 * range;

const isYea = vote.position === 'yea';
const minFrac = isYea ? 0.5 : 0.05;
const maxFrac = isYea ? 1.0 : 0.2;
const lengthFrac = minFrac + r2 * (maxFrac - minFrac);
const lineLen = (outerR - innerR) * lengthFrac;

const x1 = cx + innerR * Math.cos(voteAngle);
const y1 = cy + innerR * Math.sin(voteAngle);
const x2 = cx + (innerR + lineLen) * Math.cos(voteAngle);
const y2 = cy + (innerR + lineLen) * Math.sin(voteAngle);

// Slight quadratic curve perpendicular to the radial direction
const perpAngle = voteAngle + Math.PI / 2;
const curveMag = lineLen * 0.2 * (r3 - 0.5);
const cpx = (x1 + x2) / 2 + Math.cos(perpAngle) * curveMag;
const cpy = (y1 + y2) / 2 + Math.sin(perpAngle) * curveMag;

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.quadraticCurveTo(cpx, cpy, x2, y2);
ctx.strokeStyle = color;
ctx.lineWidth = isYea ? 1.5 : 1;
ctx.globalAlpha = isActive ? (isYea ? 0.8 : 0.5) : 0.15;
ctx.stroke();
```

with:

```typescript
const r1 = seededRandom(vote.rollCall * 31 + 7);
const r2 = seededRandom(vote.rollCall * 31 + 13);

const voteAngle = wedge.startAngle + r1 * range;

const isYea = vote.position === 'yea';
const minFrac = isYea ? 0.5 : 0.05;
const maxFrac = isYea ? 1.0 : 0.2;
const lengthFrac = minFrac + r2 * (maxFrac - minFrac);
const lineLen = (outerR - innerR) * lengthFrac;

const x1 = cx + innerR * Math.cos(voteAngle);
const y1 = cy + innerR * Math.sin(voteAngle);
const x2 = cx + (innerR + lineLen) * Math.cos(voteAngle);
const y2 = cy + (innerR + lineLen) * Math.sin(voteAngle);

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.strokeStyle = color;
ctx.lineWidth = isYea ? 1.5 : 1;
ctx.globalAlpha = isActive ? (isYea ? 0.8 : 0.5) : 0.15;
ctx.stroke();
```

- [ ] **Step 2: Update file header comment**

Replace lines 3–14 (the comment block at the top of the file):

```typescript
/**
 * Voteprint canvas.
 *
 * Renders a donut-ring chart where each arc sector represents an issue
 * category. Individual votes are drawn as radial straight lines radiating
 * outward from the inner ring, encoding alignment with the issue position:
 *   - aligned (alignedWithIssue === true)  → long line (50–100% of depth), 1.5px, full opacity
 *   - opposed (alignedWithIssue === false) → short stub (5–20% of depth), 1px, reduced opacity
 *   - null + yea                           → medium line (30–50%), 1px, slightly reduced
 *   - null + nay                           → short stub (5–20%), 1px, reduced
 *   - absent                               → not drawn
 *
 * Click or use keyboard (← → Escape Enter) to select / deselect categories.
 * DPR-scaled for sharp rendering on retina displays.
 */
```

- [ ] **Step 3: Run Voteprint tests**

```bash
pnpm run test -- --testPathPattern="Voteprint.test"
```

Expected: PASS (straight lines don't change click/keyboard logic).

- [ ] **Step 4: Commit**

```bash
git add components/Voteprint/Voteprint.tsx
git commit -m "feat(voteprint): replace quadratic bezier curves with straight radial lines"
```

---

### Task 6: Update canvas spoke encoding to use alignedWithIssue

**Files:**
- Modify: `components/Voteprint/Voteprint.tsx`

Now replace the `isYea`-based length/opacity/weight logic with `alignedWithIssue`-based logic per spec Section 4d.

| Condition | Length fraction | Opacity | Line weight |
|-----------|----------------|---------|-------------|
| `alignedWithIssue === true` | 0.5–1.0 | 0.8 | 1.5px |
| `alignedWithIssue === false` | 0.05–0.2 | 0.5 | 1px |
| `null` + yea | 0.3–0.5 | 0.65 | 1px |
| `null` + nay | 0.05–0.2 | 0.5 | 1px |
| absent | not drawn | — | — |

- [ ] **Step 1: Update the spoke encoding block**

Replace the `isYea`-based block (starting from `const isYea = ...` through the end of `ctx.stroke()`) with the `alignedWithIssue`-based version. This is the block that starts with `const isYea = vote.position === 'yea';` in the file after Task 5:

```typescript
const { alignedWithIssue } = vote;

let minFrac: number;
let maxFrac: number;
let lineWeight: number;
let opacity: number;

if (alignedWithIssue === true) {
  minFrac = 0.5; maxFrac = 1.0; lineWeight = 1.5; opacity = isActive ? 0.8 : 0.15;
} else if (alignedWithIssue === false) {
  minFrac = 0.05; maxFrac = 0.2; lineWeight = 1; opacity = isActive ? 0.5 : 0.15;
} else if (vote.position === 'yea') {
  minFrac = 0.3; maxFrac = 0.5; lineWeight = 1; opacity = isActive ? 0.65 : 0.15;
} else {
  // null + nay
  minFrac = 0.05; maxFrac = 0.2; lineWeight = 1; opacity = isActive ? 0.5 : 0.15;
}

const lengthFrac = minFrac + r2 * (maxFrac - minFrac);
const lineLen = (outerR - innerR) * lengthFrac;

const x1 = cx + innerR * Math.cos(voteAngle);
const y1 = cy + innerR * Math.sin(voteAngle);
const x2 = cx + (innerR + lineLen) * Math.cos(voteAngle);
const y2 = cy + (innerR + lineLen) * Math.sin(voteAngle);

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.strokeStyle = color;
ctx.lineWidth = lineWeight;
ctx.globalAlpha = opacity;
ctx.stroke();
```

- [ ] **Step 2: Run Voteprint tests**

```bash
pnpm run test -- --testPathPattern="Voteprint.test"
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

```bash
pnpm run test
```

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Voteprint/Voteprint.tsx
git commit -m "feat(voteprint): encode spoke length/opacity by alignedWithIssue"
```

---

### Task 7: VoteList — alignment tags and banner (tests first)

**Files:**
- Modify: `__tests__/voteprint/VoteList.test.tsx`
- Modify: `components/VoteList/VoteList.tsx`
- Modify: `components/VoteList/VoteList.module.css`

- [ ] **Step 1: Write failing tests for alignment tags**

In `__tests__/voteprint/VoteList.test.tsx`, add a new describe block after the existing ones:

```typescript
// ---------------------------------------------------------------------------
// Alignment tags
// ---------------------------------------------------------------------------

describe('VoteList — alignment tags', () => {
  it('shows ↑ With issue tag when alignedWithIssue is true', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText('↑ With issue')).toBeInTheDocument();
  });

  it('shows ↓ Against issue tag when alignedWithIssue is false', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText('↓ Against issue')).toBeInTheDocument();
  });

  it('shows no alignment tag when alignedWithIssue is null', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: null }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.queryByText('↑ With issue')).not.toBeInTheDocument();
    expect(screen.queryByText('↓ Against issue')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write failing tests for stance-aware banner**

```typescript
// ---------------------------------------------------------------------------
// Contact banner — stance-aware text
// ---------------------------------------------------------------------------

describe('VoteList — stance-aware banner', () => {
  it('shows "has consistently supported" when all category votes are aligned', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: true }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(
      screen.getByText(/has consistently supported/i),
    ).toBeInTheDocument();
  });

  it('shows "voted against … N out of N times" when all category votes are opposed', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: false }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(
      screen.getByText(/has voted against/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 out of 2/i)).toBeInTheDocument();
  });

  it('shows mixed "voted with X times and against it Y times" when split', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText(/voted with.*1 time.*against it 1 time/i)).toBeInTheDocument();
  });

  it('shows fallback "Concerned about" when total mapped is zero (all null)', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: null }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: null }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText(/concerned about/i)).toBeInTheDocument();
  });

  it('shows generic contact text when no activeCategory', () => {
    const votes = [makeVote({ rollCall: 1, alignedWithIssue: null })];
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );
    expect(
      screen.getByText(/want to contact/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm run test -- --testPathPattern="VoteList"
```

Expected: FAIL — alignment tag elements don't exist yet, banner text doesn't match.

- [ ] **Step 4: Add alignment tags to VoteList.tsx**

In `components/VoteList/VoteList.tsx`, inside the vote row, add after the `isPartyBreak` tag:

```tsx
{vote.alignedWithIssue === true && (
  <span className={`${styles.tag} ${styles.tagAligned}`}>↑ With issue</span>
)}
{vote.alignedWithIssue === false && (
  <span className={`${styles.tag} ${styles.tagOpposed}`}>↓ Against issue</span>
)}
```

- [ ] **Step 5: Update banner logic in VoteList.tsx**

Replace the `{/* Contact banner */}` section's `<p>` text logic. Add stance-aware computation before the return statement (alongside the existing `base` computation):

```typescript
// Stance-aware banner counts (category-filtered set, null excluded from total)
const alignedCount = base.filter((v) => v.alignedWithIssue === true).length;
const againstCount = base.filter((v) => v.alignedWithIssue === false).length;
const stanceTotal = alignedCount + againstCount;
```

Then update the banner `<p>`:

```tsx
<p className={styles.contactText}>
  {categoryLabel
    ? stanceTotal === 0
      ? `Concerned about ${repName}'s votes on ${categoryLabel}?`
      : againstCount === stanceTotal
        ? `${repName} has voted against ${categoryLabel} ${stanceTotal} out of ${stanceTotal} times`
        : alignedCount === stanceTotal
          ? `${repName} has consistently supported ${categoryLabel}`
          : `${repName} has voted with ${categoryLabel} ${alignedCount} ${alignedCount === 1 ? 'time' : 'times'} and against it ${againstCount} ${againstCount === 1 ? 'time' : 'times'}`
    : `Want to contact ${repName} about their voting record?`}
</p>
```

- [ ] **Step 6: Add tagAligned and tagOpposed CSS to VoteList.module.css**

First, append the light-mode rules after the existing `.tagPartyBreak` style block:

```css
/* Alignment tags — issue position encoding */
.tagAligned {
  background: #dcfce7;
  color: #166534;
}

.tagOpposed {
  background: #fee2e2;
  color: #991b1b;
}
```

Then, find the existing `@media (prefers-color-scheme: dark)` block (which already contains `.tagPassed`, `.tagFailed`, `.tagPartyBreak` dark variants) and add `tagAligned` and `tagOpposed` inside it — do not create a second `@media` block:

```css
  .tagAligned {
    background: rgba(22, 101, 52, 0.3);
    color: #86efac;
  }

  .tagOpposed {
    background: rgba(153, 27, 27, 0.3);
    color: #fca5a5;
  }
```

- [ ] **Step 7: Run VoteList tests**

```bash
pnpm run test -- --testPathPattern="VoteList"
```

Expected: All PASS.

- [ ] **Step 8: Run full test suite**

```bash
pnpm run test
```

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add components/VoteList/VoteList.tsx components/VoteList/VoteList.module.css __tests__/voteprint/VoteList.test.tsx
git commit -m "feat(VoteList): add alignment tags and stance-aware contact banner"
```

---

## Chunk 3: URLs, sessionStorage, and RepHeader

### Task 8: Simplify URL + write sessionStorage on navigate (tests first)

This task touches only `RepresentativeCard.tsx` and its test file. All `page.tsx` changes are deferred to Task 9, where the full RepHeader rewrite is done in the same commit — this avoids a broken intermediate state where `page.tsx` constructs a `rep` object missing `name` and `state` while `RepHeader` still expects them.

**Files:**
- Modify: `__tests__/components/RepresentativeCard.test.tsx`
- Modify: `components/RepresentativeCard.tsx`

- [ ] **Step 1: Write failing tests for RepresentativeCard**

In `__tests__/components/RepresentativeCard.test.tsx`, add after the existing describe block:

```typescript
describe('RepresentativeCard — explore link behaviour', () => {
  it('explore link uses simplified URL shape (party + chamber only)', () => {
    render(<RepresentativeCard representative={baseRep} />);
    const exploreLink = screen.getByRole('link', { name: /explore voting record/i });
    expect(exploreLink).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/rep\/rep-1\?party=Republican&chamber=House$/),
    );
  });

  it('explore link URL does not contain name or state params', () => {
    render(<RepresentativeCard representative={baseRep} />);
    const exploreLink = screen.getByRole('link', { name: /explore voting record/i });
    const href = exploreLink.getAttribute('href') ?? '';
    expect(href).not.toContain('name=');
    expect(href).not.toContain('state=');
  });

  it('explore link does not appear for senators', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(
      screen.queryByRole('link', { name: /explore voting record/i }),
    ).not.toBeInTheDocument();
  });

  it('clicking explore link writes representative to sessionStorage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    render(<RepresentativeCard representative={baseRep} />);
    const exploreLink = screen.getByRole('link', { name: /explore voting record/i });

    fireEvent.click(exploreLink);

    expect(setItemSpy).toHaveBeenCalledWith(
      'cyr_viewing_rep',
      JSON.stringify(baseRep),
    );
    setItemSpy.mockRestore();
  });
});
```

Add the missing `fireEvent` import at the top:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm run test -- --testPathPattern="RepresentativeCard"
```

Expected: FAIL — href still contains `name=`, `state=`; no sessionStorage write.

- [ ] **Step 3: Update RepresentativeCard.tsx explore link**

In `components/RepresentativeCard.tsx`, update the explore link:

```tsx
<Link
  href={`/rep/${representative.id}?party=${encodeURIComponent(party)}&chamber=House`}
  className={styles.exploreAction}
  onClick={() =>
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(representative))
  }
>
  Explore voting record
</Link>
```

Remove the `name`, `state`, and `chamber=House` encoding from the old href (the new href already has `chamber=House` and party only).

- [ ] **Step 4: Run RepresentativeCard tests**

```bash
pnpm run test -- --testPathPattern="RepresentativeCard"
```

Expected: All PASS.

- [ ] **Step 5: Run full test suite**

```bash
pnpm run test
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add components/RepresentativeCard.tsx __tests__/components/RepresentativeCard.test.tsx
git commit -m "feat(RepresentativeCard): simplify rep page URL to party+chamber only; write rep to sessionStorage on navigate"
```

---

### Task 9: Rewrite RepHeader as a client component with sessionStorage; update page.tsx

**Files:**
- Create: `__tests__/components/RepHeader.test.tsx`
- Modify: `components/RepHeader/RepHeader.tsx`
- Modify: `components/RepHeader/RepHeader.module.css`
- Modify: `app/rep/[bioguideId]/page.tsx`

> **Note on `repName` in VoteList banner:** After this task, `page.tsx` will pass `bioguideId` as the `repName` prop to `VoteprintContent` (and thus `VoteprintPanel` and `VoteList`). This means the contact banner in `VoteList` will show the bioguideId (e.g., "B001305 has consistently supported…") when the user navigates directly to a URL without prior sessionStorage data. This is a known limitation — fixing it would require a significant architecture change (making VoteList itself a client component that reads from sessionStorage) which is out of scope for this plan. The normal user flow (clicking through from the main page) always populates sessionStorage before loading the rep page, so the degraded case is rare.

- [ ] **Step 1: Write failing RepHeader tests**

Create `__tests__/components/RepHeader.test.tsx`:

```typescript
/**
 * Tests for the RepHeader client component.
 *
 * RepHeader reads from sessionStorage on mount. Tests use beforeEach to
 * set/clear sessionStorage, and flush the useEffect with act().
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import RepHeader from '@/components/RepHeader/RepHeader';
import type { Representative } from '@/lib/types';

const mockRep: Representative = {
  id: 'B001305',
  name: 'Aaron Bean',
  party: 'Republican',
  state: 'FL',
  phone: '202-225-0123',
  url: 'https://bean.house.gov',
  photoUrl: 'https://example.com/bean.jpg',
  area: 'US House',
  reason: 'Your representative.',
};

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

const defaultProps = {
  bioguideId: 'B001305',
  party: 'Republican' as const,
  chamber: 'House' as const,
};

describe('RepHeader — fallback state', () => {
  it('renders fallback "?" avatar when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    // Avatar should show "?" (the SSR/empty fallback)
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders fallback "Representative" name when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /representative/i })).toBeInTheDocument();
  });

  it('renders fallback notice text when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    expect(
      screen.getByText(/visit from the main page for full representative details/i),
    ).toBeInTheDocument();
  });

  it('shows party badge from props even in fallback state', () => {
    render(<RepHeader {...defaultProps} />);
    expect(screen.getAllByText('Republican').length).toBeGreaterThan(0);
  });
});

describe('RepHeader — populated from sessionStorage', () => {
  it('shows representative name when sessionStorage is populated', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    expect(screen.getByRole('heading', { name: /aaron bean/i })).toBeInTheDocument();
  });

  it('hides fallback notice when sessionStorage is populated', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    expect(
      screen.queryByText(/visit from the main page/i),
    ).not.toBeInTheDocument();
  });

  it('renders photo img when photoUrl is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const img = screen.getByRole('img', { name: /aaron bean/i });
    expect(img).toHaveAttribute('src', mockRep.photoUrl);
  });

  it('shows initials avatar when photo fails to load (onError)', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });

    const img = screen.getByRole('img', { name: /aaron bean/i });
    // Simulate broken image
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    // Photo should be gone, initials should appear
    expect(screen.queryByRole('img', { name: /aaron bean/i })).not.toBeInTheDocument();
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders phone link when phone is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const phoneLink = screen.getByRole('link', { name: /202-225-0123/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:202-225-0123');
  });

  it('renders website link when url is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const websiteLink = screen.getByRole('link', { name: /contact via website/i });
    expect(websiteLink).toHaveAttribute('href', mockRep.url);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm run test -- --testPathPattern="RepHeader"
```

Expected: FAIL — component is still a server component; no sessionStorage logic.

- [ ] **Step 3: Rewrite RepHeader.tsx as a client component**

Replace `components/RepHeader/RepHeader.tsx` entirely:

```typescript
'use client';

/**
 * Displays a representative's identity.
 *
 * SSR / fallback state: shows "?" avatar and "Representative" name, with
 * party + chamber badges from props. On mount, reads sessionStorage
 * ('cyr_viewing_rep') and updates to full data: name, initials/photo,
 * state, phone, and website link.
 *
 * Props come from the URL (party, chamber, bioguideId) which are stable
 * across SSR and hydration. Display data comes from sessionStorage to
 * keep URLs clean.
 */

import { useState, useEffect } from 'react';
import type { Representative } from '@/lib/types';
import styles from './RepHeader.module.css';

interface RepHeaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  chamber: 'House' | 'Senate';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export default function RepHeader({ party, chamber }: RepHeaderProps) {
  const [rep, setRep] = useState<Representative | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cyr_viewing_rep');
      if (raw) {
        setRep(JSON.parse(raw) as Representative);
      }
    } catch {
      // sessionStorage unavailable or invalid JSON — stay in fallback state
    }
  }, []);

  const partyMod =
    party === 'Democrat'
      ? styles.partyDem
      : party === 'Republican'
        ? styles.partyRep
        : styles.partyInd;

  const displayName = rep?.name ?? 'Representative';
  const avatarContent =
    rep && showPhoto && rep.photoUrl ? null : rep ? initials(rep.name) : '?';

  return (
    <header className={styles.header}>
      {/* Avatar — photo if available, initials otherwise */}
      <div className={styles.avatarWrapper}>
        {rep && showPhoto && rep.photoUrl ? (
          <img
            src={rep.photoUrl}
            width={64}
            height={64}
            alt={`${rep.name}, ${party} representative from ${rep.state}`}
            className={styles.photo}
            onError={() => setShowPhoto(false)}
          />
        ) : (
          <div className={`${styles.avatar} ${rep ? partyMod : ''}`} aria-hidden="true">
            {avatarContent}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h1 className={styles.name}>{displayName}</h1>

        {rep ? (
          <p className={styles.meta}>
            <span className={styles.location}>{rep.state}</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span className={styles.partyLabel}>{party}</span>
          </p>
        ) : (
          <p className={styles.meta}>
            <span className={styles.partyLabel}>{party}</span>
          </p>
        )}

        <div className={styles.badges}>
          <span className={`${styles.badge} ${partyMod}`}>{party}</span>
          <span className={styles.badge}>{chamber}</span>
        </div>

        {rep && rep.phone && (
          <a href={`tel:${rep.phone}`} className={styles.phoneLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            {rep.phone}
          </a>
        )}

        {rep && rep.url && (
          <a
            href={rep.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.websiteLink}
          >
            Contact via website ↗
          </a>
        )}

        {!rep && (
          <p className={styles.fallbackNotice}>
            Visit from the main page for full representative details
          </p>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update page.tsx — remove display searchParams, update RepHeader call**

In `app/rep/[bioguideId]/page.tsx`, make all changes atomically to avoid TypeScript compile errors:

1. Update `PageProps` `searchParams` type — remove `name`, `state`, `district`:

```typescript
searchParams: Promise<{
  party?: string;
  chamber?: string;
}>;
```

2. Remove only the lines that read `name`, `state`, and `district` from `sp`:

```typescript
// Remove these three lines:
const name = sp.name ? decodeURIComponent(sp.name) : 'Representative';
const state = sp.state ?? '';
const district = sp.district ? parseInt(sp.district, 10) : undefined;
```

Keep `normalizeParty(sp.party)` and the `chamber` conditional — these already produce the correct literal types (`'Democrat' | 'Republican' | 'Independent'` and `'House' | 'Senate'`) needed by `RepHeader` and `VoteprintContent`:

```typescript
// Keep these lines unchanged:
const party = normalizeParty(sp.party);
const chamber: 'House' | 'Senate' = sp.chamber === 'Senate' ? 'Senate' : 'House';
```

3. Simplify `rep` object (or remove it entirely and use local vars):

```typescript
const rep = { bioguideId, party, chamber };
```

4. Update `<RepHeader>` call to new props:

```tsx
<RepHeader bioguideId={bioguideId} party={party} chamber={chamber} />
```

5. Update `VoteprintContent` — use `bioguideId` as fallback `repName`:

```tsx
<VoteprintContent
  bioguideId={rep.bioguideId}
  party={rep.party}
  repName={rep.bioguideId}
  repBioguideId={rep.bioguideId}
/>
```

6. Update the file header comment:

```typescript
/**
 * Dynamic route: /rep/[bioguideId]
 *
 * Server component — fetches the member's voting record before rendering.
 * Rep display data (name, photoUrl, phone, url, state) is stored in
 * sessionStorage under 'cyr_viewing_rep' by RepresentativeCard on navigate,
 * and read by RepHeader on the client. Only party and chamber are read from
 * URL search params (still needed for server-side data fetching and routing).
 *
 * If the vote fetch takes longer than VOTE_FETCH_TIMEOUT_MS, a timeout error
 * state is shown and a background cache-warming fetch is fired so the next
 * visit hits the cache.
 */
```

- [ ] **Step 5: Verify page.tsx TypeScript compiles**

```bash
pnpm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: No TypeScript errors in `app/rep/[bioguideId]/page.tsx`. If there are errors, they are likely from the old `rep.name` reference — fix them before continuing.

- [ ] **Step 6: Add new CSS to RepHeader.module.css**

Add to `components/RepHeader/RepHeader.module.css`:

```css
/* Photo (plain img, onError swaps to initials avatar) */
.avatarWrapper {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
}

.photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

/* Phone tel link */
.phoneLink {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-top: 0.25rem;
}

.phoneLink:hover {
  color: var(--link-color);
  text-decoration: underline;
}

/* Website link */
.websiteLink {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--link-color);
  text-decoration: none;
  margin-top: 0.125rem;
}

.websiteLink:hover {
  text-decoration: underline;
}

/* Fallback notice (shown when sessionStorage is empty) */
.fallbackNotice {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
  margin: 0.25rem 0 0;
}

@media (max-width: 480px) {
  .avatarWrapper {
    width: 52px;
    height: 52px;
  }
  .photo {
    width: 52px;
    height: 52px;
  }
}
```

- [ ] **Step 7: Run RepHeader tests**

```bash
pnpm run test -- --testPathPattern="RepHeader"
```

Expected: All PASS.

- [ ] **Step 8: Run full test suite**

```bash
pnpm run test
```

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add components/RepHeader/RepHeader.tsx components/RepHeader/RepHeader.module.css app/rep/[bioguideId]/page.tsx __tests__/components/RepHeader.test.tsx
git commit -m "feat(RepHeader): rewrite as client component with sessionStorage hydration; simplify page.tsx searchParams"
```

---

## Chunk 4: Scripts

### Task 10: Add stance to map-votes.ts and apply-mappings.ts

**Files:**
- Modify: `scripts/map-votes.ts`
- Modify: `scripts/apply-mappings.ts`

These scripts are not covered by the automated test suite. Verification is done by running the scripts and inspecting output format.

- [ ] **Step 1: Update ApiSuggestion type in map-votes.ts to include stance**

In `scripts/map-votes.ts`, update the `ApiSuggestion` interface:

```typescript
interface ApiSuggestion {
  key: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  stance: 'for' | 'against';
  note: string;
}
```

- [ ] **Step 2: Update SuggestionEntry type in map-votes.ts to include stance**

```typescript
interface SuggestionEntry {
  category: string;
  note: string;
  stance?: 'for' | 'against';
  confidence?: string;
}
```

- [ ] **Step 3: Update buildSystemPrompt to instruct model to provide stance**

In the `buildSystemPrompt()` function, update the return value JSON shape description:

```typescript
return `You are categorizing U.S. Congressional roll call votes into issue categories for a civic engagement tool. You will be given a list of votes and must assign each one to the single most relevant category from the provided list, or "none" if no category fits well.

Categories:
${categoryList}

Rules:
- Assign exactly one category per vote, or "none" if it does not fit
- Procedural votes (motions to adjourn, quorum calls, rule adoptions with no policy content) should be "none"
- When a vote touches multiple categories, pick the primary one
- Base your decision on the question text and description only
- For "stance": "for" means a YEA vote takes the progressive/protective position on the issue. "against" means a YEA vote opposes or restricts the issue position.
- Return ONLY valid JSON, no other text

Return a JSON array in this exact shape:
[
  {
    "key": "{congress}-{chamber}-{rollCall}",
    "category": "{issue-id or none}",
    "confidence": "high" | "medium" | "low",
    "stance": "for" | "against",
    "note": "{one sentence explaining what this vote was about}"
  }
]`;
```

- [ ] **Step 4: Update suggestion collection in map-votes.ts to save stance**

In the suggestions loop inside `categorizeBatch`'s caller, update `SuggestionEntry` construction to include stance:

```typescript
for (const s of suggestions) {
  if (!s.key || s.category === 'none' || !s.category || !s.stance) continue;
  const entry: SuggestionEntry = {
    category: s.category,
    note: s.note ?? '',
    stance: s.stance,
  };
  if (s.confidence === 'high') {
    highSuggestions[s.key] = entry;
    batchHigh++;
  } else {
    reviewSuggestions[s.key] = { ...entry, confidence: s.confidence };
    batchReview++;
  }
}
```

- [ ] **Step 5: Update VoteMapping type in apply-mappings.ts to include stance**

In `scripts/apply-mappings.ts`:

```typescript
interface VoteMapping {
  category: string;
  note: string;
  stance?: 'for' | 'against';
}

interface SuggestionEntry {
  category: string;
  note: string;
  stance?: 'for' | 'against';
  confidence?: string;
}
```

- [ ] **Step 6: Update apply-mappings.ts merge logic to write stance**

```typescript
mappings[key] = {
  category: entry.category,
  note: entry.note,
  ...(entry.stance ? { stance: entry.stance } : {}),
};
```

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
pnpm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 8: Run full test suite one final time**

```bash
pnpm run test
```

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/map-votes.ts scripts/apply-mappings.ts
git commit -m "feat(scripts): add stance field to map-votes and apply-mappings pipelines"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
pnpm run test
```

Expected: All tests PASS (no fewer than the 180 tests that existed before, plus ~25 new ones).

- [ ] **Run build**

```bash
pnpm run build
```

Expected: Build completes with no TypeScript or build errors.
