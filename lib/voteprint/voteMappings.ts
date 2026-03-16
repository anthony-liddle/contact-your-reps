/**
 * Vote category mapping layer.
 * Reads from data/vote-mappings.json to enrich raw votes with issue categories.
 */

import mappings from '../../data/vote-mappings.json';
import type { RawCongressVote, Vote, VoteCategory } from './types';

interface VoteMappingEntry {
  category: VoteCategory;
  note: string;
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
 * Looks up the category and note for a raw vote from vote-mappings.json.
 * Returns { category: null, note: '' } if no mapping exists for the vote.
 *
 * @param vote - The raw vote to look up
 * @returns The matching category and note, or null defaults if unmapped
 */
export function enrichWithCategory(
  vote: RawCongressVote,
): Pick<Vote, 'category' | 'note'> {
  const key = buildMappingKey(vote);
  const entry = voteMappings[key];

  if (!entry) {
    return { category: null, note: '' };
  }

  return { category: entry.category, note: entry.note };
}
