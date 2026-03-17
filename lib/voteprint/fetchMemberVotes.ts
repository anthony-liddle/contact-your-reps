/**
 * Server-side fetcher for House member voting records via the Congress.gov API.
 * Must only be called from server contexts (API routes, Server Components).
 *
 * Architecture: The Congress.gov API is vote-first, not member-first. There is
 * no single endpoint that returns all votes for a given bioguideId. Instead, we:
 *   1. Page through the roll call vote list for a given congress + session
 *   2. For each vote, fetch the detail (for question + partyTotals) and the
 *      members sub-endpoint (for the member's individual vote) in parallel
 *   3. Filter for the target bioguideId and assemble RawCongressVote objects
 *
 * Caching (two layers):
 *   - Layer 1 (production): Next.js built-in fetch cache with 24-hour revalidation.
 *     Applied to every fetch() call via { next: { revalidate: 86400 } }.
 *   - Layer 2 (development): File-based cache at .cache/voteprint/{key}.json.
 *     Checked before any API calls and written after a successful full fetch.
 *     Skipped in production (NODE_ENV === 'production').
 *
 * Set VOTEPRINT_BYPASS_CACHE=true to skip both layers and always fetch fresh.
 *
 * House-only: no Senate roll call endpoint exists in the Congress.gov v3 API yet.
 * TODO: add Senate support (GET /v3/senate-vote/...) when the endpoint goes live.
 *
 * VOTE_FETCH_LIMIT: set this env var to cap how many votes are checked per
 * session. Defaults to 100. Use a low value (e.g. 20) during development to
 * avoid making hundreds of API calls on every page load.
 */

import type { RawCongressVote } from './types';
import { readCache, writeCache } from './cache';

const BASE_URL = 'https://api.congress.gov/v3';
const DEFAULT_CONGRESS = 119;
/** How many roll calls to fetch per page from the list endpoint. */
const LIST_PAGE_LIMIT = 250;
/** How many votes to process in a single Promise.all batch (= 2× API calls per batch). */
const VOTE_BATCH_SIZE = 5;
/** Sessions to check. We check session 1 first, then 2 if it exists. */
const SESSIONS = [1, 2] as const;

// ---------------------------------------------------------------------------
// Congress.gov API response shapes (internal — not exported)
// ---------------------------------------------------------------------------

interface ListVoteEntry {
  congress: number;
  rollCallNumber: number;
  sessionNumber: number;
  result: string;
  voteType: string;
  startDate: string;
  legislationNumber?: string;
  legislationType?: string;
  legislationUrl?: string;
}

interface ListResponse {
  houseRollCallVotes: ListVoteEntry[];
  pagination: { count: number; next?: string };
}

interface DetailPartyTotal {
  voteParty: string;
  yeaTotal: number;
  nayTotal: number;
  notVotingTotal: number;
}

interface DetailResponse {
  houseRollCallVote: {
    voteQuestion: string;
    votePartyTotal: DetailPartyTotal[];
  };
}

interface MemberEntry {
  bioguideID: string;
  voteCast: string;
}

interface MembersResponse {
  houseRollCallVoteMemberVotes: {
    results: MemberEntry[];
  };
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.CONGRESS_GOV_API_KEY;
  if (!key) {
    throw new Error(
      'CONGRESS_GOV_API_KEY environment variable is not set. ' +
        'Add it to your .env file before using the Voteprint feature.',
    );
  }
  return key;
}

function buildParams(extra: Record<string, string> = {}): string {
  return new URLSearchParams({
    api_key: getApiKey(),
    format: 'json',
    ...extra,
  }).toString();
}

function listUrl(congress: number, session: number, offset: number): string {
  return `${BASE_URL}/house-vote/${congress}/${session}?${buildParams({
    limit: String(LIST_PAGE_LIMIT),
    offset: String(offset),
  })}`;
}

function detailUrl(congress: number, session: number, rollCall: number): string {
  return `${BASE_URL}/house-vote/${congress}/${session}/${rollCall}?${buildParams()}`;
}

function membersUrl(
  congress: number,
  session: number,
  rollCall: number,
): string {
  // limit=450 captures all members in one request (House has at most 441 members)
  return `${BASE_URL}/house-vote/${congress}/${session}/${rollCall}/members?${buildParams({ limit: '450' })}`;
}

// ---------------------------------------------------------------------------
// Bill number formatter
// ---------------------------------------------------------------------------

/** Formats a legislation type + number into a human-readable bill identifier. */
function formatBillNumber(type: string, number: string): string {
  const typeMap: Record<string, string> = {
    HR: 'H.R.',
    HRES: 'H.Res.',
    HJRES: 'H.J.Res.',
    HCONRES: 'H.Con.Res.',
    S: 'S.',
    SRES: 'S.Res.',
    SJRES: 'S.J.Res.',
    SCONRES: 'S.Con.Res.',
  };
  const prefix = typeMap[type.toUpperCase()] ?? type;
  return `${prefix} ${number}`;
}

// ---------------------------------------------------------------------------
// Per-vote fetch helpers
// ---------------------------------------------------------------------------

/** Fetches the detail and members endpoints for one roll call in parallel. */
async function fetchVoteEnrichment(
  congress: number,
  session: number,
  rollCall: number,
): Promise<{ detail: DetailResponse; members: MembersResponse } | null> {
  try {
    const [detailRes, membersRes] = await Promise.all([
      fetch(detailUrl(congress, session, rollCall), {
        next: { revalidate: 86400 },
      }),
      fetch(membersUrl(congress, session, rollCall), {
        next: { revalidate: 86400 },
      }),
    ]);

    if (!detailRes.ok || !membersRes.ok) {
      console.warn(
        `[voteprint] Skipping roll call ${congress}/${session}/${rollCall}: ` +
          `detail=${detailRes.status} members=${membersRes.status}`,
      );
      return null;
    }

    const [detail, members]: [DetailResponse, MembersResponse] =
      await Promise.all([detailRes.json(), membersRes.json()]);

    return { detail, members };
  } catch (err) {
    console.warn(
      `[voteprint] Skipping roll call ${congress}/${session}/${rollCall} due to fetch error: ${String(err)}`,
    );
    return null;
  }
}

/** Assembles a RawCongressVote from the three API data sources. Returns null if the member didn't vote. */
function assembleVote(
  listEntry: ListVoteEntry,
  detail: DetailResponse,
  members: MembersResponse,
  bioguideId: string,
): RawCongressVote | null {
  const memberEntry = members.houseRollCallVoteMemberVotes.results.find(
    (m) => m.bioguideID === bioguideId,
  );

  if (!memberEntry) return null;

  const memberVote = memberEntry.voteCast as RawCongressVote['memberVote'];
  const { voteQuestion, votePartyTotal } = detail.houseRollCallVote;

  const dem = votePartyTotal.find((p) => p.voteParty === 'D');
  const rep = votePartyTotal.find((p) => p.voteParty === 'R');

  const hasLegislation =
    listEntry.legislationNumber && listEntry.legislationType;

  return {
    congress: listEntry.congress,
    chamber: 'House',
    session: listEntry.sessionNumber,
    rollCall: listEntry.rollCallNumber,
    date: listEntry.startDate,
    question: voteQuestion ?? '',
    description: '',
    result: listEntry.result,
    voteType: listEntry.voteType,
    bill: hasLegislation
      ? {
          number: formatBillNumber(
            listEntry.legislationType!,
            listEntry.legislationNumber!,
          ),
          title: '',
          url: listEntry.legislationUrl ?? '',
        }
      : null,
    memberVote,
    partyTotals: {
      democratic: {
        yea: dem?.yeaTotal ?? 0,
        nay: dem?.nayTotal ?? 0,
        notVoting: dem?.notVotingTotal ?? 0,
      },
      republican: {
        yea: rep?.yeaTotal ?? 0,
        nay: rep?.nayTotal ?? 0,
        notVoting: rep?.notVotingTotal ?? 0,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches all House roll call votes for a member from the Congress.gov API.
 *
 * Checks a file-based cache first (in development) and writes to it after a
 * successful fetch. In production, relies on Next.js's fetch cache (24-hour
 * revalidation applied to each underlying fetch call).
 *
 * Set VOTEPRINT_BYPASS_CACHE=true to skip all caching and always fetch fresh.
 * Set VOTE_FETCH_LIMIT to cap the number of roll calls checked per session
 * (default 100). Use a low value during development.
 *
 * @param bioguideId - The member's Bioguide identifier (e.g. "S000344")
 * @param congress   - The Congress number to fetch (defaults to 119; coverage starts at 118)
 * @returns Raw, un-transformed vote records for the member
 */
export async function fetchMemberVotes(
  bioguideId: string,
  congress: number = DEFAULT_CONGRESS,
): Promise<RawCongressVote[]> {
  const cacheKey = `member-${bioguideId}-congress-${congress}`;
  const bypassCache = process.env.VOTEPRINT_BYPASS_CACHE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  // Layer 2: file-based cache (development only)
  if (!bypassCache && !isProduction) {
    const cached = await readCache<RawCongressVote[]>(cacheKey);
    if (cached) return cached;
  }

  const fetchLimit = parseInt(process.env.VOTE_FETCH_LIMIT ?? '100', 10);
  const allVotes: RawCongressVote[] = [];

  for (const session of SESSIONS) {
    let offset = 0;
    let totalInSession: number | null = null;
    let checkedThisSession = 0;

    do {
      // Fetch the next page of roll call listings
      // Layer 1: Next.js fetch cache with 24-hour revalidation
      let listRes: Response;
      try {
        listRes = await fetch(listUrl(congress, session, offset), {
          next: { revalidate: 86400 },
        });
      } catch (err) {
        console.warn(
          `[voteprint] Failed to fetch vote list for ${congress}/${session} offset=${offset}: ${String(err)}`,
        );
        break;
      }

      // A 404 means the session doesn't exist yet (e.g. session 2 of an active congress)
      if (listRes.status === 404) break;

      if (!listRes.ok) {
        throw new Error(
          `Congress.gov API returned ${listRes.status} for vote list ${congress}/${session}. ` +
            'Check that the API key is valid.',
        );
      }

      const listData: ListResponse = await listRes.json();
      const entries = listData.houseRollCallVotes ?? [];

      if (totalInSession === null) {
        totalInSession = listData.pagination?.count ?? entries.length;
      }

      // Respect the per-session fetch limit
      const remaining = fetchLimit - checkedThisSession;
      const batch = entries.slice(0, remaining);

      // Process in groups of VOTE_BATCH_SIZE to avoid hammering the API
      for (let i = 0; i < batch.length; i += VOTE_BATCH_SIZE) {
        const chunk = batch.slice(i, i + VOTE_BATCH_SIZE);

        const enrichments = await Promise.all(
          chunk.map((entry) =>
            fetchVoteEnrichment(congress, session, entry.rollCallNumber),
          ),
        );

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
    } while (
      checkedThisSession < fetchLimit &&
      offset < (totalInSession ?? 0)
    );
  }

  // Layer 2: write result to file cache (development only)
  if (!bypassCache && !isProduction) {
    await writeCache(cacheKey, allVotes);
  }

  return allVotes;
}
