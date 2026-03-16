/**
 * Voteprint feature — public API.
 * Re-exports all types and provides the single convenience entry point for
 * fetching and enriching a member's voting record.
 */

export type { VoteCategory, RawCongressVote, Vote } from './types';

export { fetchMemberVotes } from './fetchMemberVotes';
export { enrichWithCategory } from './voteMappings';
export { transformVotes } from './transformVotes';

import { fetchMemberVotes } from './fetchMemberVotes';
import { transformVotes } from './transformVotes';
import type { Vote } from './types';

/**
 * Fetches and enriches the full voting record for a House member.
 * Calls the Congress.gov API, normalizes positions and results, derives
 * partyMajority from the member's party, applies category mappings, and
 * returns the result sorted by date descending.
 *
 * @param bioguideId - The member's Bioguide identifier (e.g. "S000344")
 * @param party      - The member's party affiliation, used to derive partyMajority
 * @param congress   - The Congress number to fetch votes for (defaults to 119)
 * @returns Enriched, sorted Vote objects for the given member
 */
export async function getMemberVotes(
  bioguideId: string,
  party: 'Democrat' | 'Republican' | 'Independent',
  congress?: number,
): Promise<Vote[]> {
  const rawVotes = await fetchMemberVotes(bioguideId, congress);
  return transformVotes(rawVotes, party);
}
