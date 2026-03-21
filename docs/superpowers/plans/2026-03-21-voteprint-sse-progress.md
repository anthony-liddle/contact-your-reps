# Voteprint SSE Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static "this may take 60 seconds" voteprint loading skeleton with a live SSE-driven progress bar showing real-time vote fetch status from Congress.gov.

**Architecture:** The page server component checks the Vercel Blob / file cache at render time. On a cache miss it renders a `VoteprintLoader` client component that opens an EventSource connection; the SSE route runs `fetchMemberVotes` with an `onProgress` callback that emits live events to the client. When the SSE stream emits `"complete"` the client calls `router.refresh()`, which causes the server to re-render with a warm cache and return the real `VoteprintPanel`.

**Tech Stack:** Next.js 15 App Router, TypeScript, CSS Modules, Jest, Vercel Blob

---

## File Map

| File | Role |
|------|------|
| `lib/voteprint/cache.ts` | Add `checkVoteCache` export |
| `lib/voteprint/fetchMemberVotes.ts` | Add optional `onProgress` param; add final completion call |
| `app/api/votes/[bioguideId]/progress/route.ts` | New SSE route |
| `app/rep/[bioguideId]/VoteprintLoader.tsx` | New client component — EventSource state machine |
| `app/rep/[bioguideId]/page.tsx` | Conditional render: cache hit → Suspense path, miss → VoteprintLoader |
| `components/VoteprintSkeleton/VoteprintSkeleton.tsx` | Add `progress` prop + progress bar markup |
| `components/VoteprintSkeleton/VoteprintSkeleton.module.css` | Progress bar styles |
| `__tests__/voteprint/fetchMemberVotes.test.ts` | Add 4 new `onProgress` tests |
| `vercel.json` | Create with `maxDuration: 120` for SSE route |

---

## Task 1: `checkVoteCache` — cache module

**Files:**
- Modify: `lib/voteprint/cache.ts`
- Test: `__tests__/voteprint/cache.test.ts` (add new `describe` block)

- [ ] **Step 1: Write the failing test**

Create `__tests__/voteprint/checkVoteCache.test.ts`:

```typescript
// Tests checkVoteCache — a thin wrapper around readCache.
// Mocks readCache so we can control its return value without hitting the file system.
jest.mock('@/lib/voteprint/cache', () => {
  const actual = jest.requireActual('@/lib/voteprint/cache');
  return {
    ...actual,
    readCache: jest.fn(),
  };
});

import { checkVoteCache, readCache } from '@/lib/voteprint/cache';

const mockReadCache = readCache as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('checkVoteCache', () => {
  it('returns true when readCache returns non-null data', async () => {
    mockReadCache.mockResolvedValue([{ congress: 119 }]);

    const result = await checkVoteCache('S000344', 119);

    expect(result).toBe(true);
  });

  it('returns false when readCache returns null', async () => {
    mockReadCache.mockResolvedValue(null);

    const result = await checkVoteCache('S000344', 119);

    expect(result).toBe(false);
  });

  it('calls readCache with the correct key format', async () => {
    mockReadCache.mockResolvedValue(null);

    await checkVoteCache('W000187', 118);

    expect(mockReadCache).toHaveBeenCalledWith('member-W000187-congress-118');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- --testPathPattern="checkVoteCache" --no-coverage
```

Expected: FAIL — `checkVoteCache is not a function` (export doesn't exist yet)

- [ ] **Step 3: Implement `checkVoteCache` in `lib/voteprint/cache.ts`**

Add at the bottom of `lib/voteprint/cache.ts` (after the `writeCache` export):

```typescript
/**
 * Returns true if a valid (non-expired) cache entry exists for the given member
 * and congress, false otherwise. Does not trigger any network fetch.
 *
 * @param bioguideId - The member's Bioguide identifier (e.g. "S000344")
 * @param congress   - The Congress number (e.g. 119)
 */
export async function checkVoteCache(
  bioguideId: string,
  congress: number,
): Promise<boolean> {
  const key = `member-${bioguideId}-congress-${congress}`;
  const result = await readCache(key);
  return result !== null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="checkVoteCache" --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/voteprint/cache.ts __tests__/voteprint/checkVoteCache.test.ts
git commit -m "feat(voteprint): add checkVoteCache to cache module"
```

---

## Task 2: `onProgress` callback — `fetchMemberVotes`

The `onProgress` callback fires after each `VOTE_BATCH_SIZE` (5) chunk of roll calls is processed. `totalInSession` is set from the first list-page response *before* the batch loop, so it's always a number by the time `onProgress` is called — `total: null` does not occur with this implementation. A final `onProgress(totalChecked, totalChecked)` fires unconditionally before the function returns.

**Files:**
- Modify: `lib/voteprint/fetchMemberVotes.ts`
- Test: `__tests__/voteprint/fetchMemberVotes.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the bottom of `__tests__/voteprint/fetchMemberVotes.test.ts`. These tests use a helper that mocks `fetch` at the URL level to distinguish list, detail, and member endpoints:

```typescript
// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates roll call list entries with sequential roll call numbers. */
function makeListEntries(count: number, startRollCall = 1) {
  return Array.from({ length: count }, (_, i) => ({
    rollCallNumber: startRollCall + i,
    result: 'Passed',
    voteType: 'Yea-and-Nay',
    startDate: '2025-01-15',
  }));
}

/**
 * Builds a fetch mock that returns sensible responses for all three endpoint
 * types (list, detail, members).
 *
 * - List endpoint: returns `entries` with `pagination.count = total`
 * - Detail endpoint: returns a minimal vote detail
 * - Members endpoint: returns a single member result for `bioguideId`
 *   so that `assembleVote` always produces a vote record
 * - Any subsequent list fetch (offset > 0 or session 2) returns 404
 */
function makeFetchMock(
  bioguideId: string,
  entries: ReturnType<typeof makeListEntries>,
  total: number,
) {
  let listCallCount = 0;
  return (url: string) => {
    // Members endpoint
    if (url.includes('/members?')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVoteMemberVotes: {
              results: [{ bioguideID: bioguideId, voteCast: 'Yea' }],
            },
          }),
      });
    }

    // Detail endpoint — three URL segments after /house-vote/ before the query
    if (/\/house-vote\/\d+\/\d+\/\d+\?/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVote: {
              voteQuestion: 'On Passage',
              votePartyTotal: [
                { voteParty: 'D', yeaTotal: 200, nayTotal: 5, notVotingTotal: 0 },
                { voteParty: 'R', yeaTotal: 3, nayTotal: 210, notVotingTotal: 0 },
              ],
            },
          }),
      });
    }

    // List endpoint — first call returns entries; subsequent calls return 404
    listCallCount += 1;
    if (listCallCount === 1) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVotes: entries,
            pagination: { count: total },
          }),
      });
    }
    // Session 2 / additional pages
    return Promise.resolve({ ok: false, status: 404 });
  };
}

// ---------------------------------------------------------------------------
// onProgress tests
// ---------------------------------------------------------------------------

describe('fetchMemberVotes — onProgress callback', () => {
  const BIOGUIDE = 'S000344';
  // VOTE_BATCH_SIZE = 5 (internal constant in fetchMemberVotes.ts)
  const BATCH_SIZE = 5;

  it('calls onProgress once per batch as roll calls are processed', async () => {
    // 10 entries = 2 batches of 5; total from pagination = 10
    const entries = makeListEntries(10);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, 10),
    );
    mockReadCache.mockReturnValue(null);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    // Intermediate calls: one per batch (2 batches)
    // Final call: (totalChecked, totalChecked)
    // Total: 3 calls
    const calls = onProgress.mock.calls;
    // First batch
    expect(calls[0]).toEqual([BATCH_SIZE, 10]);
    // Second batch
    expect(calls[1]).toEqual([BATCH_SIZE * 2, 10]);
    // Final completion call (totalChecked = 10, totalChecked = 10)
    expect(calls[2]).toEqual([10, 10]);
    expect(calls).toHaveLength(3);
  });

  it('fires final onProgress(n, n) after all sessions complete, regardless of environment', async () => {
    const entries = makeListEntries(BATCH_SIZE); // exactly 1 batch
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, BATCH_SIZE),
    );
    mockReadCache.mockReturnValue(null);

    // Test in non-production (dev) mode — NODE_ENV is already 'test'
    const onProgressDev = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgressDev);

    const devCalls = onProgressDev.mock.calls;
    const lastDevCall = devCalls[devCalls.length - 1];
    // Final call has fetched === total
    expect(lastDevCall[0]).toBe(lastDevCall[1]);

    // Test in production mode
    jest.resetAllMocks();
    mockReadCache.mockReturnValue(null);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, BATCH_SIZE),
    );
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    const onProgressProd = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgressProd);

    const prodCalls = onProgressProd.mock.calls;
    const lastProdCall = prodCalls[prodCalls.length - 1];
    expect(lastProdCall[0]).toBe(lastProdCall[1]);
  });

  it('does not call onProgress when the cache already has data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockReadCache.mockReturnValue([{ congress: 119 }] as any);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    expect(onProgress).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('provides total from pagination count on the first onProgress call', async () => {
    // total from pagination = 50; only BATCH_SIZE entries in the response
    const entries = makeListEntries(BATCH_SIZE);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, 50),
    );
    mockReadCache.mockReturnValue(null);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    // First intermediate call: fetched=5, total=50 (from pagination.count)
    expect(onProgress.mock.calls[0]).toEqual([BATCH_SIZE, 50]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern="fetchMemberVotes" --no-coverage
```

Expected: FAIL — `onProgress` parameter does not exist; 4 new tests fail. Existing 5 tests should still pass.

- [ ] **Step 3: Add `onProgress` to `fetchMemberVotes`**

In `lib/voteprint/fetchMemberVotes.ts`, make these changes:

**a) Add the `ProgressCallback` type above the main export:**

```typescript
/** Callback invoked after each batch of roll calls is processed and once at completion. */
export type ProgressCallback = (fetched: number, total: number | null) => void;
```

**b) Update the function signature** (add `onProgress` as third param):

```typescript
export async function fetchMemberVotes(
  bioguideId: string,
  congress: number = DEFAULT_CONGRESS,
  onProgress?: ProgressCallback,
): Promise<RawCongressVote[]> {
```

**c) Add a `totalChecked` counter** right after the `allVotes` declaration (inside the function, before the `for (const session of SESSIONS)` loop):

```typescript
  const allVotes: RawCongressVote[] = [];
  let totalChecked = 0; // roll calls examined across all sessions
```

**d) Move the `checkedThisSession` increment inside the batch chunk loop and add the `onProgress` call.** Find this block:

```typescript
        for (let j = 0; j < chunk.length; j++) {
          const enrichment = enrichments[j];
          if (!enrichment) continue;

          const vote = assembleVote(
            chunk[j],
            enrichment.detail,
            enrichment.members,
            bioguideId,
          );

          if (vote) allVotes.push(vote);
        }
      }

      checkedThisSession += batch.length;
      offset += LIST_PAGE_LIMIT;
```

Replace with:

```typescript
        for (let j = 0; j < chunk.length; j++) {
          const enrichment = enrichments[j];
          if (!enrichment) continue;

          const vote = assembleVote(
            chunk[j],
            enrichment.detail,
            enrichment.members,
            bioguideId,
          );

          if (vote) allVotes.push(vote);
        }

        totalChecked += chunk.length;
        onProgress?.(totalChecked, totalInSession);
      }

      checkedThisSession += batch.length;
      offset += LIST_PAGE_LIMIT;
```

**e) Add the final completion call** right before `return allVotes` (after the cache write block):

```typescript
  // Layer 2: write result to file cache (development only)
  if (!bypassCache && !isProduction) {
    await writeCache(cacheKey, allVotes);
  }

  onProgress?.(totalChecked, totalChecked); // final completion signal

  return allVotes;
```

- [ ] **Step 4: Run all fetchMemberVotes tests**

```bash
pnpm test -- --testPathPattern="fetchMemberVotes" --no-coverage
```

Expected: PASS (all 9 tests — 5 existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add lib/voteprint/fetchMemberVotes.ts __tests__/voteprint/fetchMemberVotes.test.ts
git commit -m "feat(voteprint): add onProgress callback to fetchMemberVotes"
```

---

## Task 3: SSE route — `/api/votes/[bioguideId]/progress`

No unit tests for this route (it's an integration point; the progress logic is tested through `fetchMemberVotes`).

**Files:**
- Create: `app/api/votes/[bioguideId]/progress/route.ts`

- [ ] **Step 1: Create the SSE route**

Create `app/api/votes/[bioguideId]/progress/route.ts`:

```typescript
/**
 * GET /api/votes/[bioguideId]/progress?party=...&congress=119
 *
 * Server-Sent Events stream for voteprint cold-cache loading.
 *
 * On cache hit:  immediately emits {"type":"complete","total":N} and closes.
 * On cache miss: runs fetchMemberVotes with an onProgress callback that emits
 *                {"type":"progress","fetched":N,"total":M} events, then
 *                writes to cache and emits {"type":"complete","total":N}.
 * On error:      emits {"type":"error","message":"..."} and closes.
 *
 * The route explicitly calls writeCache after fetchMemberVotes returns so that
 * the Vercel Blob cache is populated in production (fetchMemberVotes only writes
 * the file cache in development).
 */

import { NextRequest } from 'next/server';
import { fetchMemberVotes } from '@/lib/voteprint/fetchMemberVotes';
import { readCache, writeCache } from '@/lib/voteprint/cache';
import type { RawCongressVote } from '@/lib/voteprint/types';

/** Allow up to 120 s — cold fetches can take ~60 s. Requires Vercel Pro or above. */
export const maxDuration = 120;

function normalizeParty(
  p: string | null,
): 'Democrat' | 'Republican' | 'Independent' {
  if (p === 'Democrat' || p === 'Republican') return p;
  return 'Independent';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> },
) {
  const { bioguideId } = await params;
  const sp = request.nextUrl.searchParams;
  const party = normalizeParty(sp.get('party'));
  const congress = parseInt(sp.get('congress') ?? '119', 10);
  const cacheKey = `member-${bioguideId}-congress-${congress}`;

  const encode = (data: object) =>
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Cache hit — return immediately with total vote count
        const cached = await readCache<RawCongressVote[]>(cacheKey);
        if (cached) {
          controller.enqueue(encode({ type: 'complete', total: cached.length }));
          return;
        }

        // Cache miss — fetch with progress, then write cache
        const allVotes = await fetchMemberVotes(
          bioguideId,
          congress,
          (fetched, total) => {
            controller.enqueue(encode({ type: 'progress', fetched, total }));
          },
        );

        // Explicitly write Vercel Blob cache (fetchMemberVotes only writes the
        // file cache in development; this ensures production is covered)
        await writeCache(cacheKey, allVotes);

        controller.enqueue(encode({ type: 'complete', total: allVotes.length }));
      } catch (err) {
        controller.enqueue(
          encode({ type: 'error', message: String(err) }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
pnpm test --no-coverage
```

Expected: all existing tests pass (the new file has no tests to fail)

- [ ] **Step 3: Commit**

```bash
git add app/api/votes/[bioguideId]/progress/route.ts
git commit -m "feat(voteprint): add SSE progress route for cold-cache loading"
```

---

## Task 4: `VoteprintSkeleton` — progress prop + styles

**Files:**
- Modify: `components/VoteprintSkeleton/VoteprintSkeleton.tsx`
- Modify: `components/VoteprintSkeleton/VoteprintSkeleton.module.css`

- [ ] **Step 1: Add progress bar styles to the CSS module**

In `components/VoteprintSkeleton/VoteprintSkeleton.module.css`, add before the final `@media (prefers-reduced-motion: reduce)` block:

```css
/* Progress bar — shown below the loading message when progress data is available */
.progressBar {
  height: 4px;
  background: var(--input-readonly-bg);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
  width: 220px;
}

.progressFill {
  height: 100%;
  background: var(--color-text-info);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Indeterminate animation — used when total is unknown */
@keyframes indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

.progressIndeterminate {
  height: 100%;
  width: 30%;
  background: var(--color-text-info);
  border-radius: 2px;
  animation: indeterminate 1.4s ease-in-out infinite;
}
```

Add these rules inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
  .progressFill { transition: none; }
  .progressIndeterminate { animation: none; width: 50%; }
```

- [ ] **Step 2: Update `VoteprintSkeleton.tsx` to accept and render progress**

Replace the entire file content:

```tsx
/**
 * VoteprintSkeleton — shown as the Suspense fallback while vote data loads,
 * and as the loading UI inside VoteprintLoader during SSE progress streaming.
 *
 * Mirrors the visual structure of VoteprintPanel so the page layout is stable
 * during the fetch. When a `progress` prop is supplied, the loading message
 * updates live and a progress bar appears below it.
 */

import type { ReactNode } from 'react';
import styles from './VoteprintSkeleton.module.css';

type Progress =
  | { fetched: number; total: number | null }
  | 'complete'
  | null
  | undefined;

interface VoteprintSkeletonProps {
  progress?: Progress;
}

function getLoadingContent(progress: Progress): {
  message: string;
  bar: ReactNode;
} {
  if (!progress) {
    return {
      message:
        'Fetching voting record from Congress.gov — this may take up to 60 seconds for a first-time load. Subsequent visits will be instant.',
      bar: null,
    };
  }

  if (progress === 'complete') {
    return {
      message: 'Almost there — processing votes…',
      bar: (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '100%' }} />
        </div>
      ),
    };
  }

  if (progress.total !== null) {
    const pct = Math.min(
      100,
      Math.round((progress.fetched / progress.total) * 100),
    );
    return {
      message: `Fetching voting record… ${progress.fetched} of ${progress.total} votes`,
      bar: (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      ),
    };
  }

  return {
    message: `Fetching voting record… ${progress.fetched} votes so far`,
    bar: (
      <div className={styles.progressBar}>
        <div className={styles.progressIndeterminate} />
      </div>
    ),
  };
}

export default function VoteprintSkeleton({ progress }: VoteprintSkeletonProps = {}) {
  const { message, bar } = getLoadingContent(progress);

  return (
    <div
      className={styles.panel}
      aria-busy="true"
      aria-label="Loading voting record…"
    >
      {/* Heading bar */}
      <div className={styles.headingBar} />

      {/* Canvas + legend row */}
      <div className={styles.visualSection}>
        <div className={styles.canvasColumn}>
          {/* Circular placeholder — same 220px diameter as the real canvas */}
          <div className={styles.canvasCircle} aria-hidden="true" />

          {/* Loading message — static or live depending on progress prop */}
          <p className={styles.loadingMessage}>{message}</p>

          {/* Progress bar — only shown when progress data is available */}
          {bar}
        </div>

        {/* Legend placeholder — 6 rows */}
        <div className={styles.legendWrapper} aria-hidden="true">
          {[60, 75, 50, 80, 65, 45].map((w, i) => (
            <div key={i} className={styles.legendRow}>
              <div className={styles.legendDot} />
              <div className={styles.legendBar} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Vote list placeholder — 4 rows */}
      <div className={styles.voteList} aria-hidden="true">
        {[100, 85, 95, 70].map((w, i) => (
          <div key={i} className={styles.voteRow}>
            <div className={styles.voteBarShort} />
            <div className={styles.voteBarLong} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test --no-coverage
```

Expected: all tests pass. Verify `VoteprintSkeleton` snapshot tests (if any) still pass; if a snapshot mismatch occurs, update the snapshot with `pnpm test -- -u --testPathPattern="VoteprintSkeleton"`.

- [ ] **Step 4: Commit**

```bash
git add components/VoteprintSkeleton/VoteprintSkeleton.tsx \
        components/VoteprintSkeleton/VoteprintSkeleton.module.css
git commit -m "feat(voteprint): add progress prop to VoteprintSkeleton"
```

---

## Task 5: `VoteprintLoader` — client component

**Files:**
- Create: `app/rep/[bioguideId]/VoteprintLoader.tsx`

This component opens an EventSource, tracks the state machine (`streaming → completing | error`), and renders `VoteprintSkeleton` with live progress. On `"complete"` it calls `router.refresh()`.

- [ ] **Step 1: Create `VoteprintLoader.tsx`**

Create `app/rep/[bioguideId]/VoteprintLoader.tsx`:

```tsx
/**
 * VoteprintLoader — client component for cold-cache voteprint loading.
 *
 * Opens an EventSource to /api/votes/[bioguideId]/progress and renders
 * VoteprintSkeleton with live progress updates. On "complete", calls
 * router.refresh() which causes the server to re-render VoteprintContent
 * from the now-warm cache.
 *
 * State machine:
 *   streaming  — SSE active; skeleton shows live progress
 *   completing — "complete" received; skeleton shows 100% bar; refresh in-flight
 *   error      — SSE failed; error UI with reload button
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VoteprintSkeleton from '@/components/VoteprintSkeleton/VoteprintSkeleton';
import styles from './page.module.css';

interface VoteprintLoaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  congress: number;
}

type LoaderState = 'streaming' | 'completing' | 'error';

interface ProgressData {
  fetched: number;
  total: number | null;
}

export default function VoteprintLoader({
  bioguideId,
  party,
  congress,
}: VoteprintLoaderProps) {
  const router = useRouter();
  const [state, setState] = useState<LoaderState>('streaming');
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    const url = `/api/votes/${bioguideId}/progress?party=${encodeURIComponent(party)}&congress=${congress}`;
    const es = new EventSource(url);

    es.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        fetched?: number;
        total?: number | null;
        message?: string;
      };

      if (data.type === 'progress') {
        setProgress({ fetched: data.fetched ?? 0, total: data.total ?? null });
      } else if (data.type === 'complete') {
        es.close();
        setState('completing');
        router.refresh();
      } else if (data.type === 'error') {
        es.close();
        setState('error');
      }
    };

    es.onerror = () => {
      es.close();
      setState('error');
    };

    return () => {
      es.close();
    };
  }, [bioguideId, party, congress, router]);

  if (state === 'error') {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>
          Unable to load voting record. This may be a temporary issue — try
          reloading the page.
        </p>
        <div className={styles.errorActions}>
          <Link href="/" className={styles.errorBack}>
            ← Back to representatives
          </Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <VoteprintSkeleton
      progress={state === 'completing' ? 'complete' : progress}
    />
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test --no-coverage
```

Expected: all tests pass (no tests for this file — EventSource + router requires e2e)

- [ ] **Step 3: Commit**

```bash
git add app/rep/[bioguideId]/VoteprintLoader.tsx
git commit -m "feat(voteprint): add VoteprintLoader client component"
```

---

## Task 6: Update `page.tsx` — conditional render

**Files:**
- Modify: `app/rep/[bioguideId]/page.tsx`

- [ ] **Step 1: Update the import list and VoteprintContent section**

In `app/rep/[bioguideId]/page.tsx`, add two imports:

```typescript
import { checkVoteCache } from '@/lib/voteprint/cache';
import VoteprintLoader from './VoteprintLoader';
```

**Change the `RepPage` function** to check the cache and pass the congress constant, and update the conditional render in the `content` div:

The `RepPage` function currently calls `getMemberVotes` indirectly via `VoteprintContent`. Add the cache check:

```typescript
export default async function RepPage({ params, searchParams }: PageProps) {
  const { bioguideId } = await params;
  const sp = await searchParams;

  const party = normalizeParty(sp.party);
  const chamber: 'House' | 'Senate' = sp.chamber === 'Senate' ? 'Senate' : 'House';

  const CONGRESS = 119;
  const rep = { bioguideId, party, chamber };

  // Check cache for House members so we can choose cold vs warm render path
  const isCached =
    rep.chamber === 'House'
      ? await checkVoteCache(rep.bioguideId, CONGRESS)
      : false;

  return (
    <>
      {/* Sub-page navigation — same blue as the main site header */}
      <nav className={styles.subpageNav} aria-label="Site navigation">
        <div className={styles.subpageNavInner}>
          <Link href="/" className={styles.backLink}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.backIcon}
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to representatives
          </Link>
          <span className={styles.siteName}>
            Contact Your Representatives
          </span>
        </div>
      </nav>

      <main className={styles.page}>
        <RepHeader bioguideId={bioguideId} party={party} chamber={chamber} />

        <div className={styles.content}>
          {rep.chamber === 'House' ? (
            isCached ? (
              <Suspense fallback={<VoteprintSkeleton />}>
                <VoteprintContent
                  bioguideId={rep.bioguideId}
                  party={rep.party}
                  repName={rep.bioguideId}
                  repBioguideId={rep.bioguideId}
                />
              </Suspense>
            ) : (
              <VoteprintLoader
                bioguideId={rep.bioguideId}
                party={rep.party}
                congress={CONGRESS}
              />
            )
          ) : (
            <VoteprintUnavailable />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
```

**Update the content section** (the `rep.chamber === 'House'` conditional inside `<div className={styles.content}>`):

Replace:
```tsx
{rep.chamber === 'House' ? (
  <Suspense fallback={<VoteprintSkeleton />}>
    <VoteprintContent
      bioguideId={rep.bioguideId}
      party={rep.party}
      repName={rep.bioguideId}
      repBioguideId={rep.bioguideId}
    />
  </Suspense>
) : (
  <VoteprintUnavailable />
)}
```

With:
```tsx
{rep.chamber === 'House' ? (
  isCached ? (
    <Suspense fallback={<VoteprintSkeleton />}>
      <VoteprintContent
        bioguideId={rep.bioguideId}
        party={rep.party}
        repName={rep.bioguideId}
        repBioguideId={rep.bioguideId}
      />
    </Suspense>
  ) : (
    <VoteprintLoader
      bioguideId={rep.bioguideId}
      party={rep.party}
      congress={CONGRESS}
    />
  )
) : (
  <VoteprintUnavailable />
)}
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test --no-coverage
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/rep/[bioguideId]/page.tsx
git commit -m "feat(voteprint): use SSE loader for cold-cache; Suspense for warm-cache"
```

---

## Task 7: `vercel.json` — `maxDuration` for SSE route

The SSE route can run up to 60 s on a cold fetch. Without a `maxDuration` override, Vercel will kill the function at 10 s (Hobby) or 15 s (Pro default).

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "functions": {
    "app/api/votes/[bioguideId]/progress/route.ts": {
      "maxDuration": 120
    }
  }
}
```

> **Note:** `maxDuration: 120` requires Vercel Pro or Enterprise. On the Hobby plan the maximum is 60 s — reduce to `60` if deploying on Hobby.

- [ ] **Step 2: Run the full test suite and build**

```bash
pnpm test --no-coverage && pnpm build
```

Expected: all tests pass; build succeeds

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore(vercel): set maxDuration=120 for SSE progress route"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the complete test suite**

```bash
pnpm test
```

Expected: all tests pass with no regressions

- [ ] **Step 2: Run a production build**

```bash
pnpm build
```

Expected: build completes with no TypeScript errors

- [ ] **Step 3: Verify TypeScript types**

```bash
pnpm typecheck 2>/dev/null || pnpm exec tsc --noEmit
```

Expected: no type errors

- [ ] **Step 4: Commit any fixups discovered during verification**

```bash
git add -p  # stage only relevant fixes
git commit -m "fix(voteprint): address type/build issues from SSE progress feature"
```

---

## Reference: SSE event contract

```
data: {"type":"progress","fetched":20,"total":100}\n\n   ← rolls calls checked / session total
data: {"type":"progress","fetched":100,"total":100}\n\n  ← final intermediate (fetched===total)
data: {"type":"complete","total":87}\n\n                 ← member's actual vote count; triggers router.refresh()
data: {"type":"error","message":"..."}\n\n               ← fatal error; triggers error UI
```

`fetched` counts roll calls examined across all sessions (monotonically increasing).
`total` is `totalInSession` — the roll call count for the current session from the API pagination response. It resets between sessions for multi-session members. The `complete` event's `total` is the count of votes found for the member (a subset of roll calls examined).
