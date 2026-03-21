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
