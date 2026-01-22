/**
 * Representatives API integration
 * Uses whoismyrepresentative.com to resolve representatives by ZIP code.
 * Enriches data with congress-legislators dataset for contact form URLs.
 *
 * Note: whoismyrepresentative.com is licensed under Creative Commons Attribution 3.0.
 * congress-legislators data is public domain.
 */

import type { Representative, RepresentativesResult } from './types';
import {
  fetchLegislatorsData,
  findLegislator,
  type LegislatorInfo,
} from './legislators-data';

/**
 * Response format from whoismyrepresentative.com API
 */
interface WhoIsMyRepMember {
  name: string;
  party: string;
  state: string;
  district: string;
  phone: string;
  office: string;
  link: string;
}

interface WhoIsMyRepResponse {
  results?: WhoIsMyRepMember[];
  error?: string;
}

/**
 * Validates a U.S. ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  // Match 5-digit or 9-digit (ZIP+4) format
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

/**
 * Determines if a member is a Senator based on district field and link
 * Senators have an empty district field and senate.gov in their website
 */
function isSenator(member: WhoIsMyRepMember): boolean {
  // Senators have empty district field
  if (!member.district || member.district.trim() === '') {
    return true;
  }
  // Fallback: check if their website is senate.gov
  if (member.link && member.link.includes('senate.gov')) {
    return true;
  }
  return false;
}

/**
 * Formats the office title for display
 */
function formatOfficeTitle(member: WhoIsMyRepMember): string {
  if (isSenator(member)) {
    return `U.S. Senator (${member.state})`;
  }
  return `U.S. Representative (${member.state}-${member.district})`;
}

/**
 * Enriches a representative with data from the congress-legislators dataset
 */
function enrichRepresentative(
  member: WhoIsMyRepMember,
  legislators: LegislatorInfo[]
): Representative {
  const baseRep: Representative = {
    name: member.name,
    office: formatOfficeTitle(member),
    party: member.party || undefined,
    phones: member.phone ? [member.phone] : undefined,
    urls: member.link ? [member.link] : undefined,
  };

  // Try to find matching legislator for additional data
  const legislator = findLegislator(member.name, member.state, legislators);

  if (legislator) {
    return {
      ...baseRep,
      contactFormUrl: legislator.contactFormUrl,
      bioguideId: legislator.bioguideId,
      // Prefer congress-legislators phone if available (more likely to be current)
      phones: legislator.phone ? [legislator.phone] : baseRep.phones,
      // Add official website URL if available
      urls: legislator.websiteUrl
        ? [legislator.websiteUrl, ...(baseRep.urls || [])]
        : baseRep.urls,
    };
  }

  return baseRep;
}

/**
 * Fetches federal representatives for a given ZIP code
 */
export async function getRepresentativesByZip(
  zipCode: string
): Promise<RepresentativesResult> {
  if (!isValidZipCode(zipCode)) {
    return {
      representatives: [],
      error: 'Please enter a valid 5-digit U.S. ZIP code.',
    };
  }

  // Use only the 5-digit portion
  const zip5 = zipCode.trim().substring(0, 5);

  try {
    // Fetch both data sources in parallel
    // Use local API route to avoid CORS issues with whoismyrepresentative.com
    const [repsResponse, legislatorsData] = await Promise.all([
      fetch(`/api/representatives?zip=${zip5}`),
      fetchLegislatorsData(),
    ]);

    if (!repsResponse.ok) {
      throw new Error(`API request failed: ${repsResponse.status}`);
    }

    const data: WhoIsMyRepResponse = await repsResponse.json();

    if (data.error) {
      return {
        representatives: [],
        error: data.error,
      };
    }

    if (!data.results || data.results.length === 0) {
      return {
        representatives: [],
        error: 'No representatives found for this ZIP code. Please verify the ZIP code is correct.',
      };
    }

    // Map and enrich API response with congress-legislators data
    const representatives: Representative[] = data.results.map((member) =>
      enrichRepresentative(member, legislatorsData)
    );

    // Sort: Senators first, then House Representatives
    representatives.sort((a, b) => {
      const aIsSenator = a.office.toLowerCase().includes('senator');
      const bIsSenator = b.office.toLowerCase().includes('senator');
      if (aIsSenator && !bIsSenator) return -1;
      if (!aIsSenator && bIsSenator) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      representatives,
      normalizedInput: {
        zip: zip5,
      },
    };
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return {
      representatives: [],
      error: 'Unable to fetch representative information. Please try again later.',
    };
  }
}

/**
 * Extracts all available email addresses from representatives
 */
export function extractEmails(representatives: Representative[]): string[] {
  const emails: string[] = [];
  for (const rep of representatives) {
    if (rep.emails && rep.emails.length > 0) {
      emails.push(...rep.emails);
    }
  }
  return [...new Set(emails)]; // Remove duplicates
}
