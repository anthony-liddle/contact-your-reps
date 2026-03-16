# Voteprint — Stance-Aware Encoding, Clean URLs, RepHeader Enhancements

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

Five coordinated changes to the voteprint feature:

1. Clean URLs + sessionStorage for rep display data
2. RepHeader shows full rep info from sessionStorage
3. Straight lines in the voteprint canvas (remove quadratic curves)
4. Stance-aware spoke encoding (aligned vs. opposed, not raw yea/nay)
5. Test coverage for all new behaviour

---

## 1. URL Structure + sessionStorage Data Flow

### Final URL shape

```
/rep/{bioguideId}?party=X&chamber=Y
```

Only fields the server strictly needs:
- `party` — passed to `getMemberVotes` to derive `partyMajority`
- `chamber` — gates the `VoteprintUnavailable` branch

All display fields (`name`, `state`, `district`, `photoUrl`, `phone`, `url`) move to sessionStorage.

### Write on navigate — `RepresentativeCard.tsx`

```tsx
<Link
  href={`/rep/${representative.id}?party=${encodeURIComponent(party)}&chamber=House`}
  onClick={() =>
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(representative))
  }
>
  Explore voting record
</Link>
```

Next.js `<Link onClick>` fires before navigation, so the write is always complete before the new page loads.

**sessionStorage key**: `cyr_viewing_rep`
Existing keys for reference: `cyr_zip`, `cyr_category`

### `page.tsx` changes

- Remove reading of `name`, `state`, `district` from `searchParams`
- Keep reading `party` and `chamber`
- Keep `normalizeParty()` — still needed for URL-derived party
- Pass `{ bioguideId, party, chamber }` to `<RepHeader>`

---

## 2. RepHeader — Client Component with Full Rep Info

### Hydration approach

**Option B**: SSR renders the fallback state (stable structure, placeholder data). On mount, reads sessionStorage and updates to full data. Small visual update on hydration; no hydration mismatch errors.

### Props after change

```tsx
interface RepHeaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  chamber: 'House' | 'Senate';
}
```

### SSR / fallback state (sessionStorage empty or not yet read)

- Avatar: single `"?"` character (bioguideId chars are not meaningful to display)
- Name: `"Representative"`
- Meta: party + chamber from props (URL-derived, stable across SSR and client)
- Badges: party badge + chamber badge (from props)
- Phone: not shown
- Website link: not shown
- Muted notice below badges: `"Visit from the main page for full representative details"`

### Client state (sessionStorage populated)

Reads `cyr_viewing_rep` JSON on mount. Uses:
- `name` → derive initials (first letter of each word, max 2 chars, e.g. `"Aaron Bean"` → `"AB"`)
- `state`, `district` (if present) → meta line
- `photoUrl` → photo (see below)
- `phone` → tel link with phone icon
- `url` → website link
- `party`, `chamber` → already shown from props; sessionStorage values used for consistency

Fallback notice is hidden when sessionStorage data is present.

### Photo

```tsx
<img
  src={photoUrl}
  width={52}
  height={52}
  alt={`${name}, ${party} representative from ${state}`}
  style={{ borderRadius: '50%', objectFit: 'cover' }}
  onError={() => setShowPhoto(false)}
/>
```

- Regular `<img>` (not `next/image`) to avoid domain allow-list configuration
- `onError` swaps to initials avatar via `showPhoto` state boolean
- Falls back to initials avatar when `photoUrl` is absent

### Phone row

```tsx
<a href={`tel:${phone}`} className={styles.phoneLink}>
  <svg width="14" height="14" viewBox="0 0 24 24" ...>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 ..."/>
  </svg>
  {phone}
</a>
```

Rendered only when `phone` is present.

### Website link

```tsx
<a href={url} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
  Contact via website ↗
</a>
```

Rendered only when `url` is present. Styled as a small secondary-style link consistent with the app's button tokens.

---

## 3. Straight Lines in Voteprint Canvas

Remove the quadratic Bézier curve entirely from the vote-line drawing loop in `Voteprint.tsx`.

**Before:**
```tsx
const perpAngle = voteAngle + Math.PI / 2;
const curveMag = lineLen * 0.2 * (r3 - 0.5);
const cpx = (x1 + x2) / 2 + Math.cos(perpAngle) * curveMag;
const cpy = (y1 + y2) / 2 + Math.sin(perpAngle) * curveMag;

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.quadraticCurveTo(cpx, cpy, x2, y2);
```

**After:**
```tsx
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
```

`r3` (the third seeded random, used only for curve magnitude) is removed from the vote drawing loop. `r1` (angle jitter) and `r2` (line length fraction) are unchanged.

---

## 4. Stance-Aware Voteprint Encoding

### 4a. `data/vote-mappings.json`

Add `"stance": "for" | "against"` to every entry.

- `"for"` — a YEA vote aligns with the progressive/protective issue position
- `"against"` — a YEA vote opposes the issue position

Entries with genuine uncertainty carry `(stance: review)` appended to the `note` field as a human-review marker.

**Delete** `119-house-340` entirely (Kayla Hamilton Act — misidentified category; removing rather than assigning uncertain stance).

Full stance assignments (71 → 70 entries after deletion):

| Key | Stance | Reasoning |
|-----|--------|-----------|
| 119-house-6 | against | Laken Riley Act — mandatory detention |
| 119-house-7 | against | ICC Counteraction Act — oppose international justice |
| 119-house-11 | for | Motion to recommit = oppose trans sports ban |
| 119-house-12 | against | Passage of trans sports ban |
| 119-house-16 | against | Immigration enforcement framed as violence prevention |
| 119-house-17 | against | Criminalises undocumented immigrants |
| 119-house-22 | for | Wounded Knee memorial protection |
| 119-house-23 | against | Laken Riley Act passage |
| 119-house-26 | against | Born-Alive Act restricts reproductive healthcare |
| 119-house-27 | against | Born-Alive Act final passage |
| 119-house-28 | for | Alaska Native land restoration |
| 119-house-33 | against | HALT Fentanyl Act — permanent Schedule I criminalization |
| 119-house-57 | against | Rule enabling EPA rollback votes |
| 119-house-76 | against | Restrict energy conservation standards |
| 119-house-77 | for | Motion to recommit = oppose anti-climate bill |
| 119-house-78 | against | Repeal home electrification subsidies |
| 119-house-81 | for | Tribal trust land homeownership |
| 119-house-85 | for | Remove troops from Iran hostilities (War Powers) |
| 119-house-86 | against | DHS appropriations funds ICE |
| 119-house-87 | against | DHS appropriations funds ICE (final passage) |
| 119-house-92 | against | Citizenship proof voter registration requirement |
| 119-house-95 | against | Disapprove CFPB digital payments consumer protection rule |
| 119-house-96 | against | Revoke Israel arms export restrictions |
| 119-house-100 | against | Record Pentagon budget |
| 119-house-101 | for | Democratic motion to recommit Pentagon budget |
| 119-house-102 | against | SAVE Act voter ID requirements |
| 119-house-104 | for | TAKE IT DOWN Act — protect victims online |
| 119-house-106 | against | Rule enabling multiple EPA rollback votes |
| 119-house-109 | for | Consumer smart device transparency |
| 119-house-111 | against | EPA vehicle emissions rollback |
| 119-house-112 | against | EPA emissions standards rollback |
| 119-house-114 | against | EPA pollution control standards rollback |
| 119-house-116 | against | Reduces federal regulatory oversight |
| 119-house-122 | against | Reduces NLRB enforcement funding |
| 119-house-132 | against (stance: review) | Strengthen Quad military alliance |
| 119-house-137 | against | Disapprove CFPB bank merger consumer protections |
| 119-house-140 | against | FISA reauthorization without warrant reforms |
| 119-house-143 | against | Clean Air Act major sources rollback |
| 119-house-151 | for | SUPPORT Act — medication-assisted treatment |
| 119-house-152 | for | Motion to recommit = oppose anti-sanctuary bill |
| 119-house-153 | against | Pass anti-sanctuary cities bill |
| 119-house-162 | for | Restores DC police collective bargaining |
| 119-house-163 | against | Expanded ICE detention capacity |
| 119-house-166 | against | HALT Fentanyl Act — criminalization approach |
| 119-house-170 | for | Motion to recommit = oppose DC immigration enforcement |
| 119-house-171 | against | Anti-sanctuary enforcement in DC |
| 119-house-172 | for (stance: review) | Sanction sea pirates — direction unclear |
| 119-house-183 | against | Deportation expansion |
| 119-house-184 | against | Special interest alien surveillance/reporting |
| 119-house-185 | for | ACA marketplace subsidy extension |
| 119-house-191 | for (stance: review) | Mobile network cybersecurity |
| 119-house-196 | for (stance: review) | Communications Security Act |
| 119-house-201 | for | Anti-CBDC — prevent government financial surveillance |
| 119-house-210 | against | Bypass environmental review (Republican-led deregulation) |
| 119-house-211 | for | Motion to recommit on DoD appropriations |
| 119-house-212 | against | Pass DoD Appropriations Act FY2026 |
| 119-house-240 | against | Eliminate student loan forgiveness programs |
| 119-house-245 | for | Restores EPA methane reporting requirements |
| 119-house-259 | against | Defund EPA climate enforcement division |
| 119-house-264 | against | Stop Illegal Entry Act |
| 119-house-270 | against | DC criminal law toughening |
| 119-house-271 | against | Lower age tried as adult to 14 |
| 119-house-275 | against (stance: review) | "Policing Protection" — likely shields police from accountability |
| 119-house-287 | for (stance: review) | Cyber resilience against state-sponsored threats |
| 119-house-294 | against | Disapprove Biden-era BLM environmental management plan |
| 119-house-295 | for | Disapprove Coastal Plain oil/gas leasing |
| 119-house-296 | for | Disapprove Alaska NPR oil/gas activities |
| 119-house-298 | against | Mandatory detention + cash bail in DC |
| 119-house-299 | against | Repeal DC policing reforms |
| 119-house-304 | against | Repeal LNG export restrictions |
| 119-house-307 | for (stance: review) | Burma funding restriction — direction unclear |
| 119-house-319 | against | NDAA — record military spending |
| 119-house-320 | against | NDAA FY2026 |
| 119-house-321 | for | Motion to discharge bill restoring federal worker rights |
| 119-house-328 | against | Capital formation deregulation for investment companies |
| 119-house-331 | against (stance: review) | Republican procedural rule for labor EO nullification |
| 119-house-332 | for (stance: review) | "Protect America's Workforce Act" — name suggests pro-worker |
| 119-house-344 | against | Rule enabling Medicaid ban on trans youth healthcare |
| 119-house-345 | for | Remove troops from Western Hemisphere hostilities |
| 119-house-346 | for | Remove troops from Venezuela |
| 119-house-348 | for | Motion to recommit = Democratic opposition to weakening health bill |
| 119-house-349 | against (stance: review) | Republican-led "Lower Premiums" bill; Democrats moved to recommit |
| 119-house-350 | for | Motion to recommit = oppose Protect Children's Innocence Act |
| 119-house-351 | against | Protect Children's Innocence Act restricts trans healthcare |

### 4b. `lib/voteprint/types.ts`

```ts
// VoteMappingEntry (internal to voteMappings.ts)
interface VoteMappingEntry {
  category: VoteCategory;
  note: string;
  stance: 'for' | 'against';
}

// Vote — add one field
alignedWithIssue: boolean | null;
// true  = rep's vote aligned with the progressive issue position
// false = rep's vote opposed the issue position
// null  = unmapped vote, absent, or stance unknown
```

### 4c. `lib/voteprint/voteMappings.ts`

`enrichWithCategory` accepts `position: Vote['position']` as a second parameter and derives `alignedWithIssue` internally. Returns `Pick<Vote, 'category' | 'note' | 'alignedWithIssue'>`.

```
no mapping        → { category: null, note: '', alignedWithIssue: null }
position absent   → { ..., alignedWithIssue: null }
stance 'for'      → yea → true,  nay → false
stance 'against'  → yea → false, nay → true
```

`transformVotes.ts` passes `position` when calling `enrichWithCategory` and spreads `alignedWithIssue` into the `Vote` object.

### 4d. `Voteprint.tsx` — spoke length by `alignedWithIssue`

| Condition | Length fraction | Opacity |
|-----------|----------------|---------|
| `alignedWithIssue === true` | 0.5–1.0 | full (0.8) |
| `alignedWithIssue === false` | 0.05–0.2 | reduced (0.5) |
| `null` + yea | 0.3–0.5 | slightly reduced (0.65) |
| `null` + nay | 0.05–0.2 | reduced (0.5) |
| absent | not drawn | — |

Line weight: `alignedWithIssue === true` → 1.5px; all others → 1px.

### 4e. `VoteList.tsx` — alignment tags

Rendered alongside the Passed/Failed and Party break tags:

```tsx
{vote.alignedWithIssue === true && (
  <span className={`${styles.tag} ${styles.tagAligned}`}>↑ With issue</span>
)}
{vote.alignedWithIssue === false && (
  <span className={`${styles.tag} ${styles.tagOpposed}`}>↓ Against issue</span>
)}
```

CSS: `tagAligned` — green tones (same palette as `tagPassed`). `tagOpposed` — coral/red tones (same palette as `tagFailed`).

**Contact banner text** when `activeCategory` is set:

```
aligned = votes with alignedWithIssue === true (in category-filtered set)
against = votes with alignedWithIssue === false
total   = aligned + against

total === 0          → "Concerned about {repName}'s votes on {categoryLabel}?"
against === total    → "{repName} has voted against {categoryLabel} {total} out of {total} times"
aligned === total    → "{repName} has consistently supported {categoryLabel}"
otherwise            → "{repName} has voted with {categoryLabel} {aligned} times and against it {against} times"
```

### 4f. `scripts/map-votes.ts` + `apply-mappings.ts`

Add `stance` to the Anthropic API response shape:

```json
{
  "key": "...",
  "category": "...",
  "confidence": "high" | "medium" | "low",
  "stance": "for" | "against",
  "note": "..."
}
```

Update system prompt to instruct the model:
> `"stance": "for"` means a YEA vote takes a progressive/protective position on the issue.
> `"stance": "against"` means a YEA vote opposes or restricts the issue position.

`apply-mappings.ts` writes `stance` alongside `category` and `note` when merging to `vote-mappings.json`.

---

## 5. Tests

### `enrichWithCategory` — stance/position matrix

| stance | position | expected `alignedWithIssue` |
|--------|----------|-----------------------------|
| for | yea | true |
| for | nay | false |
| against | yea | false |
| against | nay | true |
| for | absent | null |
| against | absent | null |
| (no mapping) | any | null |

### `VoteList`

- `↑ With issue` tag renders when `alignedWithIssue === true`
- `↓ Against issue` tag renders when `alignedWithIssue === false`
- No alignment tag when `alignedWithIssue === null`
- Banner: all votes aligned → `"has consistently supported"` text
- Banner: all votes against → `"has voted against … N out of N times"` text
- Banner: mixed → `"voted with … X times and against it Y times"` text
- Banner: total === 0 (category active, none mapped) → `"Concerned about…"` fallback
- Banner: total === 0 via all absent/null → same `"Concerned about…"` fallback

### `RepresentativeCard`

- Explore link href uses simplified URL shape (`?party=X&chamber=House`)
- `sessionStorage.setItem('cyr_viewing_rep', …)` called on link click

### `RepHeader`

- Fallback state renders `"?"` avatar and `"Representative"` name when sessionStorage empty
- Full data renders when `cyr_viewing_rep` present in sessionStorage
- Photo `<img>` renders when `photoUrl` present
- Initials avatar shown when `onError` fires (photo fails to load)
- Fallback notice hidden when sessionStorage data is present

### Regression

All 180 existing tests continue to pass. Any existing test that constructs a `Vote` object is updated to include `alignedWithIssue`.

---

## Files Changed

| File | Change |
|------|--------|
| `data/vote-mappings.json` | Add `stance` to all entries; delete `119-house-340` |
| `lib/voteprint/types.ts` | Add `alignedWithIssue` to `Vote`; add `stance` to mapping entry type |
| `lib/voteprint/voteMappings.ts` | `enrichWithCategory` accepts `position`, derives `alignedWithIssue` |
| `lib/voteprint/transformVotes.ts` | Pass `position` to `enrichWithCategory`; include `alignedWithIssue` in Vote |
| `components/Voteprint/Voteprint.tsx` | Straight lines; spoke encoding via `alignedWithIssue` |
| `components/VoteList/VoteList.tsx` | Alignment tags; stance-aware banner text |
| `components/VoteList/VoteList.module.css` | `tagAligned`, `tagOpposed` styles |
| `components/RepHeader/RepHeader.tsx` | `'use client'`; reads sessionStorage on mount |
| `components/RepHeader/RepHeader.module.css` | Phone link, website link, fallback notice styles |
| `components/RepresentativeCard.tsx` | Simplified href; `onClick` sessionStorage write |
| `app/rep/[bioguideId]/page.tsx` | Remove display searchParams; pass minimal props to RepHeader |
| `scripts/map-votes.ts` | Add `stance` to prompt and response shape |
| `scripts/apply-mappings.ts` | Write `stance` when merging suggestions |
| `__tests__/…` | New tests per Section 5 |

---

## Constraints

- No new dependencies
- `lib/voteprint/` fetch and cache logic unchanged
- RepHeader degrades gracefully when sessionStorage is empty
- `<img>` tag for photos has `onError` fallback to initials avatar
- All 180 existing tests pass
