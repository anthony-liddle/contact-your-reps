/**
 * GET /api/votes/[bioguideId]?party=...&congress=119
 *
 * Dual-purpose endpoint for the voteprint feature:
 *  1. Cache-warming: called in the background from the main page after reps
 *     load to pre-populate the cache; the response body is discarded.
 *  2. Data fetch: called by VoteprintLoader after the SSE progress stream
 *     completes to retrieve the Vote[] and render VoteprintPanel client-side,
 *     eliminating the need for a router.refresh() round-trip.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMemberVotes } from '@/lib/voteprint';

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

  try {
    const votes = await getMemberVotes(bioguideId, party, congress);
    return NextResponse.json(votes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}
