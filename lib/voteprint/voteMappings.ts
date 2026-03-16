/**
 * Vote category mapping layer.
 * Reads from data/vote-mappings.json to enrich raw votes with issue categories.
 */

import mappings from '../../data/vote-mappings.json';
import type { RawCongressVote, Vote, VoteCategory } from './types';

interface VoteMappingEntry {
  category: VoteCategory;
  note: string;
  stance: 'for' | 'against';
}

type VoteMappingsJson = Record<string, VoteMappingEntry>;

const voteMappings = mappings as VoteMappingsJson;

/**
 * Builds the lookup key used in vote-mappings.json.
 * Format: "{congress}-{chamber lowercase}-{rollCall}"
 */
function buildMappingKey(vote: RawCongressVote): string {
  return `${vote.congress}-${vote.chamber.toLowerCase()}-${vote.rollCall}`;
}

/**
 * Looks up the category, note, and alignedWithIssue for a raw vote from vote-mappings.json.
 * Returns { category: null, note: '', alignedWithIssue: null } if no mapping exists for the vote.
 *
 * @param vote - The raw vote to look up
 * @param position - The normalized position ('yea' | 'nay' | 'absent')
 * @returns The matching category, note, and alignedWithIssue, or null defaults if unmapped
 */
export function enrichWithCategory(
  vote: RawCongressVote,
  position: Vote['position'],
): Pick<Vote, 'category' | 'note' | 'alignedWithIssue'> {
  const key = buildMappingKey(vote);
  const entry = voteMappings[key];

  if (!entry) {
    return { category: null, note: '', alignedWithIssue: null };
  }

  const note = entry.note.replace(/ \(stance: review\)$/, '');

  let alignedWithIssue: boolean | null = null;
  if (position !== 'absent') {
    if (entry.stance === 'for') {
      alignedWithIssue = position === 'yea';
    } else {
      alignedWithIssue = position === 'nay';
    }
  }

  return { category: entry.category, note, alignedWithIssue };
}
