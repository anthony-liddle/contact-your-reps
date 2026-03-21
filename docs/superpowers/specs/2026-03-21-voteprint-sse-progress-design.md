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

### Full cold-cache flow

1. Server renders page → `checkVoteCache` returns false → returns `<VoteprintLoader>`
2. Client hydrates → opens `EventSource` to `/api/votes/[bioguideId]/progress?party=…&congress=119`
3. SSE route calls `fetchMemberVotes` with an `onProgress` callback
4. `onProgress` emits `{"type":"progress","fetched":N,"total":M}` after each page of roll calls
5. `VoteprintLoader` updates `VoteprintSkeleton` with live progress state
6. After `writeCache` completes, `onProgress(total, total)` fires → SSE emits `{"type":"complete","total":N}`
7. Client calls `router.refresh()`
8. Server re-renders → `checkVoteCache` returns true → renders `<Suspense><VoteprintContent /></Suspense>`
9. `VoteprintContent` hits the warm cache, resolves in milliseconds
10. React replaces `VoteprintLoader` with `VoteprintPanel`

### Warm-cache flow (unchanged)

Server detects cache hit → Suspense + `VoteprintContent` → resolves instantly → `VoteprintPanel` renders. Users never see `VoteprintLoader`.

## Files Changed / Created

| File | Type | Change |
|------|------|--------|
| `lib/voteprint/cache.ts` | Modified | Export `checkVoteCache(bioguideId, congress)` |
| `lib/voteprint/fetchMemberVotes.ts` | Modified | Add optional `onProgress` callback param |
| `app/api/votes/[bioguideId]/progress/route.ts` | **New** | SSE route |
| `app/rep/[bioguideId]/VoteprintLoader.tsx` | **New** | Client component managing SSE + refresh |
| `app/rep/[bioguideId]/page.tsx` | Modified | Conditional render based on `checkVoteCache` |
| `components/VoteprintSkeleton/VoteprintSkeleton.tsx` | Modified | Add `progress` prop |
| `components/VoteprintSkeleton/VoteprintSkeleton.module.css` | Modified | Progress bar styles |
| `__tests__/voteprint/fetchMemberVotes.test.ts` | Modified | Add `onProgress` tests |

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

Calls `readCache` with the standard key format and returns `true` if a valid (non-expired) entry exists, `false` otherwise. Does not trigger any network fetch.

### `fetchMemberVotes` — `onProgress` param

```ts
type ProgressCallback = (fetched: number, total: number | null) => void

export async function fetchMemberVotes(
  bioguideId: string,
  congress?: number,
  onProgress?: ProgressCallback,
): Promise<RawCongressVote[]>
```

- Called with `(fetched, total)` after each page of roll calls is processed
- `total` is `null` until the first API response returns the pagination count
- Called with `(total, total)` after `writeCache` completes
- Existing callers (no `onProgress`) are unaffected

### SSE route — `GET /api/votes/[bioguideId]/progress`

**Query params**: `party`, `congress`

**SSE event types**:

```
data: {"type":"progress","fetched":20,"total":100}\n\n
data: {"type":"progress","fetched":40,"total":100}\n\n
data: {"type":"complete","total":87}\n\n
data: {"type":"error","message":"..."}\n\n
```

- On cache hit: immediately emits `{"type":"complete"}` and closes
- On cache miss: calls `fetchMemberVotes` with `onProgress`, emits progress events, then "complete"
- On error: emits `{"type":"error"}` and closes

**Response headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### `VoteprintLoader` (client component)

```ts
// app/rep/[bioguideId]/VoteprintLoader.tsx
interface VoteprintLoaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
}
```

State machine:
- `streaming` — SSE active, shows `<VoteprintSkeleton progress={...} />`
- `completing` — SSE "complete" received, shows skeleton at 100% + "Almost there…", calls `router.refresh()`
- `error` — shows error state with retry option (same as `VoteprintTimeout` today)

EventSource is opened in `useEffect` and closed in cleanup.

### `VoteprintSkeleton` — `progress` prop

```ts
interface VoteprintSkeletonProps {
  progress?: { fetched: number; total: number | null } | 'complete' | null
}
```

- `null` / `undefined`: existing static message ("this may take up to 60 seconds…")
- `{ fetched, total: number }`: progress bar at `fetched/total * 100%` + text "Fetching voting record… N of M votes"
- `{ fetched, total: null }`: indeterminate animated bar + "Fetching voting record… N votes so far"
- `'complete'`: bar at 100% + "Almost there — processing votes…"

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `es.onerror` fires | Close EventSource; show static skeleton fallback text; let existing 60 s Suspense timeout handle the load |
| SSE `{"type":"error"}` received | Close EventSource; show error message with retry button (same as `VoteprintTimeout`) |
| `router.refresh()` after rare cache eviction | Server returns `VoteprintLoader` again; it opens SSE again; SSE immediately emits "complete" (cache freshly written); second `router.refresh()` resolves |

## Tests

New tests added to `__tests__/voteprint/fetchMemberVotes.test.ts`:

1. **`onProgress` called per page** — two-page mock; assert `onProgress` called once per page with correct accumulated `fetched` count and `total` from pagination
2. **`onProgress` called with `(total, total)` after cache write** — assert final call is `(n, n)` and occurs after `writeCache` resolves
3. **`onProgress` not called on cache hit** — when `readCache` returns data, `onProgress` is never invoked
4. **`onProgress(n, null)` on first call** — when first page hasn't set `totalInSession` yet, `total` is `null`

No new unit tests for the SSE route (integration point; tested through `fetchMemberVotes`) or `VoteprintLoader` (EventSource + router behavior requires e2e).

## Constraints

- `onProgress` is optional — existing callers of `fetchMemberVotes` are unaffected
- `app/api/votes/[bioguideId]/route.ts` is not modified
- EventSource must be cleaned up on component unmount
- All existing tests must continue to pass
- Progress bar animation respects `prefers-reduced-motion`
