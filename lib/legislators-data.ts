/**
 * Congress Legislators Data Integration
 * Fetches and caches legislator data from the unitedstates/congress-legislators GitHub repo.
 * This provides contact form URLs, social media, and other details not available from whoismyrepresentative.com
 *
 * Data source: https://github.com/unitedstates/congress-legislators (Public Domain)
 */

const LEGISLATORS_URL =
  'https://unitedstates.github.io/congress-legislators/legislators-current.json';

const CACHE_KEY = 'congress-legislators-data';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Raw legislator data from the unitedstates/congress-legislators dataset
 */
interface RawLegislator {
  id: {
    bioguide: string;
    govtrack?: number;
    wikipedia?: string;
  };
  name: {
    first: string;
    last: string;
    middle?: string;
    official_full?: string;
    nickname?: string;
  };
  bio: {
    birthday?: string;
    gender?: string;
  };
  terms: RawTerm[];
}

interface RawTerm {
  type: 'sen' | 'rep';
  start: string;
  end: string;
  state: string;
  district?: number;
  class?: number;
  state_rank?: 'junior' | 'senior';
  party: string;
  url?: string;
  contact_form?: string;
  address?: string;
  office?: string;
  phone?: string;
  rss_url?: string;
}

/**
 * Processed legislator data for matching and display
 */
export interface LegislatorInfo {
  bioguideId: string;
  firstName: string;
  lastName: string;
  officialFullName?: string;
  state: string;
  type: 'sen' | 'rep';
  district?: number;
  party: string;
  contactFormUrl?: string;
  websiteUrl?: string;
  phone?: string;
  office?: string;
}

interface CacheData {
  timestamp: number;
  legislators: LegislatorInfo[];
}

/**
 * Checks if cached data is still valid
 */
function getCachedData(): LegislatorInfo[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    const now = Date.now();

    if (now - data.timestamp < CACHE_DURATION_MS) {
      return data.legislators;
    }
  } catch {
    // Invalid cache, ignore
  }

  return null;
}

/**
 * Saves data to cache
 */
function setCachedData(legislators: LegislatorInfo[]): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CacheData = {
      timestamp: Date.now(),
      legislators,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable, ignore
  }
}

/**
 * Processes raw legislator data into our format
 */
function processLegislator(raw: RawLegislator): LegislatorInfo | null {
  // Get the current (most recent) term
  const currentTerm = raw.terms[raw.terms.length - 1];
  if (!currentTerm) return null;

  return {
    bioguideId: raw.id.bioguide,
    firstName: raw.name.first,
    lastName: raw.name.last,
    officialFullName: raw.name.official_full,
    state: currentTerm.state,
    type: currentTerm.type,
    district: currentTerm.district,
    party: currentTerm.party,
    contactFormUrl: currentTerm.contact_form,
    websiteUrl: currentTerm.url,
    phone: currentTerm.phone,
    office: currentTerm.office,
  };
}

/**
 * Fetches legislator data from GitHub, with caching
 */
export async function fetchLegislatorsData(): Promise<LegislatorInfo[]> {
  // Check cache first
  const cached = getCachedData();
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(LEGISLATORS_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch legislators data: ${response.status}`);
    }

    const rawData: RawLegislator[] = await response.json();

    const legislators = rawData
      .map(processLegislator)
      .filter((l): l is LegislatorInfo => l !== null);

    // Cache the processed data
    setCachedData(legislators);

    return legislators;
  } catch (error) {
    console.error('Error fetching legislators data:', error);
    return [];
  }
}

/**
 * Normalizes a name for comparison (lowercase, remove periods, extra spaces)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two names match (handles variations like "Bob" vs "Robert")
 */
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact match
  if (n1 === n2) return true;

  // Check if one contains the other (for "Robert" matching "Bob Roberts")
  if (n1.includes(n2) || n2.includes(n1)) return true;

  return false;
}

/**
 * Finds a matching legislator by name and state
 */
export function findLegislator(
  name: string,
  state: string,
  legislators: LegislatorInfo[]
): LegislatorInfo | null {
  const normalizedFullName = normalizeName(name);
  const normalizedState = state.toUpperCase();

  for (const legislator of legislators) {
    // Must match state
    if (legislator.state !== normalizedState) continue;

    // Try matching against official full name
    if (legislator.officialFullName) {
      if (namesMatch(legislator.officialFullName, name)) {
        return legislator;
      }
    }

    // Try matching against first + last name
    const fullName = `${legislator.firstName} ${legislator.lastName}`;
    if (namesMatch(fullName, name)) {
      return legislator;
    }

    // Try matching last name only (less strict, but helps with name variations)
    if (normalizedFullName.includes(normalizeName(legislator.lastName))) {
      // Verify first name initial matches to avoid false positives
      const firstInitial = legislator.firstName.charAt(0).toLowerCase();
      if (normalizedFullName.includes(firstInitial)) {
        return legislator;
      }
    }
  }

  return null;
}
