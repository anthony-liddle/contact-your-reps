/**
 * Type definitions for the application
 */

export interface FieldOffice {
  phone: string;
  city: string;
}

export interface Representative {
  id: string;
  name: string;
  phone: string;
  url: string;
  photoUrl?: string;
  party: string;
  state: string;
  reason: string;
  area: string;
  fieldOffices?: FieldOffice[];
}

export interface FiveCallsResponse {
  location: string;
  lowAccuracy: boolean;
  isSplit: boolean;
  state: string;
  district: string;
  representatives: Representative[];
  error?: string;
}

export interface RepresentativesResult {
  representatives: Representative[];
  location?: string;
  state?: string;
  district?: string;
  lowAccuracy?: boolean;
  error?: string;
}

export interface GeneratedMessage {
  to: string;
  subject: string;
  body: string;
}

/** One vote entry serialized to sessionStorage for message generation. */
export interface VoteContextEntry {
  billNumber: string;
  /** Bill title from the API, may be empty. Fall back to note for display. */
  billTitle: string;
  question: string;
  date: string;
  position: 'yea' | 'nay' | 'absent';
  alignedWithIssue: boolean | null;
  note: string;
}

/**
 * Vote context written to sessionStorage ('cyr_vote_context') by VoteList
 * when the user clicks "Write to [rep]" with an active category filter.
 * Read and cleared by the main page on mount; passed to generateMessage
 * to inject specific vote references into the generated message.
 */
export interface VoteContext {
  category: string;
  repId: string;
  repName: string;
  votes: VoteContextEntry[];
}
