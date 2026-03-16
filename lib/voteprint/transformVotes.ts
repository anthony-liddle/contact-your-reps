/**
 * Transforms raw Congress.gov vote records into enriched internal Vote objects.
 */

import type { RawCongressVote, Vote } from './types';
import { enrichWithCategory } from './voteMappings';

/**
 * Normalizes the Congress.gov memberVote string to our internal three-value enum.
 * "Yea" → "yea", "Nay" → "nay", "Not Voting" / "Present" → "absent"
 */
function normalizePosition(memberVote: string): Vote['position'] {
  const lower = memberVote.toLowerCase();
  if (lower === 'yea' || lower === 'yes') return 'yea';
  if (lower === 'nay' || lower === 'no') return 'nay';
  return 'absent';
}

/**
 * Normalizes the Congress.gov result string to our two-value enum.
 * "Passed" / "Agreed to" → "passed", everything else → "failed"
 */
function normalizeResult(result: string): Vote['result'] {
  const lower = result.toLowerCase();
  if (lower === 'passed' || lower === 'agreed to') return 'passed';
  return 'failed';
}

/**
 * Derives the party majority position from aggregated party vote totals.
 * Returns null for Independent members or when yeas and nays are tied.
 */
function derivePartyMajority(
  partyTotals: RawCongressVote['partyTotals'],
  party: 'Democrat' | 'Republican' | 'Independent',
): Vote['partyMajority'] {
  if (party === 'Independent') return null;

  const totals =
    party === 'Democrat' ? partyTotals.democratic : partyTotals.republican;

  if (totals.yea > totals.nay) return 'yea';
  if (totals.nay > totals.yea) return 'nay';
  return null;
}

/**
 * Transforms an array of raw Congress.gov votes into enriched, sorted Vote objects.
 * Normalizes position and result fields, derives partyMajority from party totals,
 * derives isPartyBreak, enriches with category data, and sorts by date descending.
 *
 * @param rawVotes - The raw vote records from fetchMemberVotes
 * @param party    - The member's party affiliation, used to derive partyMajority
 * @returns Enriched Vote objects sorted by date descending (most recent first)
 */
export function transformVotes(
  rawVotes: RawCongressVote[],
  party: 'Democrat' | 'Republican' | 'Independent',
): Vote[] {
  const votes = rawVotes.map((raw): Vote => {
    const position = normalizePosition(raw.memberVote);
    const result = normalizeResult(raw.result);
    const partyMajority = derivePartyMajority(raw.partyTotals, party);
    const { category, note } = enrichWithCategory(raw, position);

    const isPartyBreak =
      position !== 'absent' &&
      partyMajority !== null &&
      position !== partyMajority;

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
      alignedWithIssue: null,
    };
  });

  return votes.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
