/**
 * GET /api/votes/[bioguideId]?party=...&congress=119
 *
 * Cache-warming endpoint for the voteprint feature. Fetching this route
 * triggers getMemberVotes server-side, which populates the Vercel Blob cache
 * (production) or local file cache (development) so the /rep/[bioguideId]
 * page loads faster on the next navigation.
 *
 * Called in the background from the main page after reps load — the response
 * body is intentionally discarded by the caller.
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
    await getMemberVotes(bioguideId, party, congress);
    return NextResponse.json({ ok: true });
  } catch {
    // Return 500 silently — the caller ignores errors by design
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
