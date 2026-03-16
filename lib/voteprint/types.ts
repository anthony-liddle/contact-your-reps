/**
 * Type definitions for the Voteprint feature.
 * Covers raw API shapes from Congress.gov, our enriched internal Vote type,
 * and the category taxonomy derived from data/issues.ts.
 */

/** Union of all issue category IDs, mirroring the IDs in data/issues.ts. */
export type VoteCategory =
  | 'universal-healthcare'
  | 'climate-justice'
  | 'police-violence'
  | 'trans-rights'
  | 'immigration-abolish-ice'
  | 'workers-rights'
  | 'housing-as-a-right'
  | 'student-debt'
  | 'voting-rights-democracy'
  | 'foreign-policy'
  | 'corporate-power'
  | 'reproductive-justice'
  | 'queer-rights'
  | 'disability-rights'
  | 'racial-justice'
  | 'indigenous-sovereignty'
  | 'surveillance-digital-rights'
  | 'drug-decriminalization'
  | 'food-sovereignty';

/**
 * Shape of a single vote as assembled from the Congress.gov House roll call API.
 * Built by combining data from three endpoints:
 *   - GET /v3/house-vote/{congress}/{session}           (list — congress, session, rollCall, date, result, voteType, bill)
 *   - GET /v3/house-vote/{congress}/{session}/{rollCall}            (detail — question, partyTotals)
 *   - GET /v3/house-vote/{congress}/{session}/{rollCall}/members    (member — memberVote)
 *
 * House-only: no Senate equivalent exists in the API yet (TODO: add Senate support when available).
 */
export interface RawCongressVote {
  congress: number;
  /** Always "House" — Senate roll call endpoints are not yet available in the Congress.gov v3 API. */
  chamber: 'House';
  session: number;
  rollCall: number;
  /** ISO 8601 date string of the vote. */
  date: string;
  /** The vote question (e.g. "On Passage", "On Agreeing to the Amendment"). */
  question: string;
  /**
   * Human-readable description of the vote subject.
   * Empty string when a bill title is unavailable without an additional lookup.
   */
  description: string;
  /** The overall outcome of the roll call (e.g. "Passed", "Failed", "Agreed to"). */
  result: string;
  /** The type of recorded vote (e.g. "Yea-and-Nay", "2/3 Yea-And-Nay", "Recorded Vote"). */
  voteType: string;
  /** Associated bill or resolution, or null for procedural votes with no attached legislation. */
  bill: {
    /** Formatted bill number (e.g. "H.R. 3424", "S.J.Res. 18"). */
    number: string;
    /** Bill title. Empty string when unavailable without an additional legislation API call. */
    title: string;
    /** Link to the bill on congress.gov. */
    url: string;
  } | null;
  /**
   * The member's recorded vote position.
   * The API uses "Yea"/"Nay" for most roll calls but "Yes"/"No" for some vote types.
   * Both variants are normalized by transformVotes.
   */
  memberVote: 'Yea' | 'Nay' | 'Yes' | 'No' | 'Not Voting' | 'Present';
  /** Aggregated vote totals by party, used to derive partyMajority in transformVotes. */
  partyTotals: {
    democratic: { yea: number; nay: number; notVoting: number };
    republican: { yea: number; nay: number; notVoting: number };
  };
}

/** Enriched internal vote type, normalized and annotated with category and party data. */
export interface Vote {
  congress: number;
  chamber: 'House';
  session: number;
  rollCall: number;
  date: string;
  question: string;
  description: string;
  result: 'passed' | 'failed';
  voteType: string;
  bill: {
    number: string;
    title: string;
    url: string;
  } | null;
  /** Normalized member vote position. */
  position: 'yea' | 'nay' | 'absent';
  /** Whether the member's party voted yea or nay overall, or null if the totals are tied or unavailable. */
  partyMajority: 'yea' | 'nay' | null;
  /** True when the member voted and their vote differs from their party's majority position. */
  isPartyBreak: boolean;
  /** Issue category this vote maps to, or null if unmapped. */
  category: VoteCategory | null;
  /** Optional human-readable note from vote-mappings.json. */
  note: string;
}
