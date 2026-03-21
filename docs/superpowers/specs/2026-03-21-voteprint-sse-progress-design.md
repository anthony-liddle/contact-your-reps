# Voteprint SSE Progress — Design Spec

**Date**: 2026-03-21
**Status**: Approved

## Problem

When a user visits a representative's voting record page for the first time (cold cache), they see a static skeleton with a message: "this may take up to 60 seconds." There is no feedback on whether the fetch is progressing. This is a poor experience that makes the page feel broken.

## Goal

Replace the static skeleton with live progress updates driven by Server-Sent Events (SSE), so users see a real-time progress bar and vote count as data is fetched from Congress.gov.

## Architecture

### Key change to `page.tsx`

The page server component gains a cache-check at render time. Depending on whether votes are already cached, it renders one of two paths:

```
Cold path (cache miss):
  → <VoteprintLoader>          (client component, manages SSE)

Warm path (cache hit):
  → <Suspense><VoteprintContent /></Suspense>   (existing path, unchanged)
```

This avoids double-fetching (the SSE route is the only thing fetching during cold load) and keeps `VoteprintPanel` entirely server-rendered.

`VoteprintContent` and its 60 s timeout remain unchanged on the warm path. The timeout is effectively unreachable on a cache hit, but it stays in place as a safety net.

### Full cold-cache flow

1. Server renders page → `checkVoteCache` returns false → returns `<VoteprintLoader>`
2. Client hydrates → opens `EventSource` to `/api/votes/[bioguideId]/progress?party=…&congress=119`
3. SSE route calls `fetchMemberVotes` with an `onProgress` callback
4. `onProgress` emits `{"type":"progress","fetched":N,"total":M}` after each batch of roll calls
5. `VoteprintLoader` updates `VoteprintSkeleton` with live progress state
6. After all votes are fetched, `onProgress(total, total)` fires → the SSE route calls `writeCache(cacheKey, allVotes)` directly (see note below) → SSE emits `{"type":"complete","total":N}`
7. Client calls `router.refresh()`
8. Server re-renders → `checkVoteCache` returns true → renders `<Suspense><VoteprintContent /></Suspense>`
9. `VoteprintContent` hits the warm cache, resolves in milliseconds
10. React replaces `VoteprintLoader` with `VoteprintPanel`

### Warm-cache flow (unchanged)

Server detects cache hit → Suspense + `VoteprintContent` → resolves instantly → `VoteprintPanel` renders. Users never see `VoteprintLoader`.

### Cache write responsibility — SSE route

`fetchMemberVotes` only calls `writeCache` when `NODE_ENV !== 'production'` (line 359–361 in the current implementation). In production it relies solely on Next.js's Layer 1 fetch cache. For `checkVoteCache` (which reads from Vercel Blob in production) to return `true` after the SSE fetch, the **SSE route** must explicitly call `writeCache(cacheKey, allVotes)` after `fetchMemberVotes` returns, before emitting `{"type":"complete"}`. This is the single place that populates the Vercel Blob in production. `fetchMemberVotes` itself is not changed in this regard.

The cache key the SSE route uses for `writeCache` is `member-${bioguideId}-congress-${congress}` — the same format used by `fetchMemberVotes` and `checkVoteCache`.

### Cache behaviour by environment

| Environment | Layer 1 (Next.js fetch cache) | Layer 2 (file / Vercel Blob) | `checkVoteCache` reads from |
|-------------|-------------------------------|-----------------------------|-----------------------------|
| Development | Applied to each `fetch()` call | Local file at `.cache/voteprint/` | Local file |
| Production  | Applied to each `fetch()` call | Vercel Blob | Vercel Blob |

`checkVoteCache` correctly returns `false` on the first cold visit in production (no Blob entry yet). The page renders `VoteprintLoader`, the SSE route fetches and writes to Blob, and `router.refresh()` re-checks — now returning `true`.

## Files Changed / Created

| File | Type | Change |
|------|------|--------|
| `lib/voteprint/cache.ts` | Modified | Export `checkVoteCache(bioguideId, congress)` |
| `lib/voteprint/fetchMemberVotes.ts` | Modified | Add optional `onProgress` callback param |
| `app/api/votes/[bioguideId]/progress/route.ts` | **New** | SSE route |
| `app/rep/[bioguideId]/VoteprintLoader.tsx` | **New** | Client component managing SSE + refresh |
| `app/rep/[bioguideId]/page.tsx` | Modified | Conditional render based on `checkVoteCache`; `congress` hardcoded to `119` |
| `components/VoteprintSkeleton/VoteprintSkeleton.tsx` | Modified | Add `progress` prop |
| `components/VoteprintSkeleton/VoteprintSkeleton.module.css` | Modified | Progress bar styles |
| `__tests__/voteprint/fetchMemberVotes.test.ts` | Modified | Add `onProgress` tests |
| `vercel.json` | Modified | Add `maxDuration` for the SSE route |

`app/api/votes/[bioguideId]/route.ts` is **not changed**.

## Component / API Contracts

### `checkVoteCache(bioguideId, congress)`

```ts
// lib/voteprint/cache.ts
export async function checkVoteCache(
  bioguideId: string,
  congress: number,
): Promise<boolean>
```

Builds the key as `member-${bioguideId}-congress-${congress}`, calls `readCache` with the default 24-hour TTL, and returns `true` if a non-null value is returned, `false` otherwise. Does not trigger any network fetch to Congress.gov.

### `fetchMemberVotes` — `onProgress` param

```ts
type ProgressCallback = (fetched: number, total: number | null) => void

export async function fetchMemberVotes(
  bioguideId: string,
  congress?: number,
  onProgress?: ProgressCallback,
): Promise<RawCongressVote[]>
```

- Called after each `VOTE_BATCH_SIZE` chunk of roll calls is processed
- `total` is `null` on the very first call (before the first list-page response sets `totalInSession`); `number` on all subsequent calls
- Called with `(total, total)` once all sessions are fully fetched — this fires unconditionally (dev, production, bypass-cache mode alike), immediately before the function returns. It is **not** tied to `writeCache`, which only runs in dev/FORCE_BLOB_CACHE environments
- Existing callers (no `onProgress`) are unaffected

### SSE route — `GET /api/votes/[bioguideId]/progress`

**Query params**:
- `party` — `'Democrat' | 'Republican' | 'Independent'`, defaults to `'Independent'`
- `congress` — integer string, defaults to `'119'`

**Function duration**: the SSE route must declare `export const maxDuration = 120` (seconds) in the route file to accommodate cold fetches that can take up to 60 s. This requires a Vercel Pro plan or above.

**SSE event types**:

```
data: {"type":"progress","fetched":20,"total":100}\n\n
data: {"type":"progress","fetched":40,"total":100}\n\n
data: {"type":"complete","total":87}\n\n
data: {"type":"error","message":"..."}\n\n
```

- On cache hit: reads the cached data to get vote count, emits `{"type":"complete","total":cachedVotes.length}` and closes
- On cache miss: calls `fetchMemberVotes` with `onProgress`, emits progress events, then "complete"
- On error: emits `{"type":"error","message":"..."}` and closes

**Response headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### `VoteprintLoader` (client component)

```ts
// app/rep/[bioguideId]/VoteprintLoader.tsx
'use client'

interface VoteprintLoaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  congress: number;
}
```

`congress` is passed from `page.tsx` as a hardcoded `119`, matching the existing `getMemberVotes` call in `VoteprintContent` (which also defaults to 119). If a future `congress` search param is added to the page, both `checkVoteCache` and `VoteprintLoader` must receive the same value.

State machine (`'streaming' | 'completing' | 'error'`):

- `streaming` — SSE active; renders `<VoteprintSkeleton progress={...} />`
- `completing` — SSE "complete" received; renders skeleton with `progress='complete'`; calls `router.refresh()`
- `error` — renders error message with retry button (same layout as `VoteprintTimeout` in `page.tsx`)

`useEffect` opens the EventSource and returns a cleanup that calls `es.close()`. The SSE URL is `/api/votes/${bioguideId}/progress?party=${party}&congress=${congress}`.

**Cache eviction re-entry**: if `router.refresh()` fires but the server still returns `VoteprintLoader` (rare race), the component unmounts and remounts. The `useEffect` runs again, opening a fresh EventSource. The SSE route finds a warm cache and immediately emits "complete", so the second `router.refresh()` resolves.

**`es.onerror` handling**: close the EventSource and transition to `error` state. Because the cold-cache path renders `VoteprintLoader` directly (no Suspense wrapper), there is no background Suspense to fall back to. The error state must render a self-contained error UI with a page-reload option.

### `VoteprintSkeleton` (shared component — no `'use client'`)

`VoteprintSkeleton` must remain a shared component with no hooks. `VoteprintLoader` (a client component) renders it with dynamic `progress` state, which is valid because client components can render server/shared components as children.

```ts
interface VoteprintSkeletonProps {
  progress?: { fetched: number; total: number | null } | 'complete' | null
}
```

- `undefined` / `null`: existing static message ("this may take up to 60 seconds…"); `aria-busy="true"`
- `{ fetched, total: number }`: determinate progress bar at `fetched/total * 100%` + "Fetching voting record… N of M votes"; `aria-busy="true"`
- `{ fetched, total: null }`: indeterminate animated bar + "Fetching voting record… N votes so far"; `aria-busy="true"`
- `'complete'`: bar at 100% + "Almost there — processing votes…"; `aria-busy="true"` (still loading — `VoteprintPanel` not yet rendered)

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `es.onerror` fires | Close EventSource; transition to `error` state; render error UI with page-reload button (no background Suspense exists in the cold-cache path) |
| SSE `{"type":"error"}` received | Same as above |
| `router.refresh()` after rare cache eviction | Component unmounts and remounts; `useEffect` opens fresh EventSource; SSE immediately emits "complete" (cache freshly written); second `router.refresh()` resolves |
| Vercel function timeout (> `maxDuration`) | SSE stream closes; `es.onerror` fires; error state shown with reload option |

## Tests

New tests added to `__tests__/voteprint/fetchMemberVotes.test.ts`:

1. **`onProgress` called per batch** — mock fetch to return two pages, each with `VOTE_BATCH_SIZE` entries; assert `onProgress` called once per batch with correct accumulated `fetched` and `total` from pagination
2. **`onProgress` called with `(total, total)` at completion** — assert the final `onProgress` call is `(n, n)` and fires after all sessions are processed, regardless of whether `writeCache` is called (test in both dev and production modes)
3. **`onProgress` not called on cache hit** — when `readCache` returns data, `onProgress` is never invoked
4. **`onProgress` called with `null` total on first batch** — mock first list fetch to return pagination count of 50; assert the first `onProgress` call has `total: null` (fires before `totalInSession` is set from the response, i.e., if `onProgress` is invoked per-chunk before the page-level total is read). *Note*: if implementation sets `totalInSession` from the first response before calling `onProgress`, this test becomes `total: 50` on the first call — adjust accordingly based on placement chosen during implementation.

No new unit tests for the SSE route (integration point; behaviour tested through `fetchMemberVotes`) or `VoteprintLoader` (EventSource + router behaviour requires e2e).

## Constraints

- `onProgress` is optional — existing callers of `fetchMemberVotes` are unaffected
- `app/api/votes/[bioguideId]/route.ts` is not modified
- `VoteprintSkeleton` remains a shared component (no `'use client'`)
- EventSource is cleaned up on component unmount via `useEffect` return value
- All existing tests must continue to pass
- Progress bar animation respects `prefers-reduced-motion`
- SSE route declares `export const maxDuration = 120`
