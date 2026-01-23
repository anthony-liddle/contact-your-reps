/**
 * Representatives API integration
 * Uses 5calls.org API to resolve representatives by ZIP code.
 */

import type { Representative, RepresentativesResult, FiveCallsResponse } from './types';

/**
 * Validates a U.S. ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  // Match 5-digit or 9-digit (ZIP+4) format
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

/**
 * Transforms the 5calls API response to our internal format
 */
function transformRepresentative(rep: {
  id: string;
  name: string;
  phone: string;
  url: string;
  photoURL?: string;
  party: string;
  state: string;
  reason: string;
  area: string;
  field_offices?: { phone: string; city: string }[];
}): Representative {
  return {
    id: rep.id,
    name: rep.name,
    phone: rep.phone,
    url: rep.url,
    photoUrl: rep.photoURL,
    party: rep.party,
    state: rep.state,
    reason: rep.reason,
    area: rep.area,
    fieldOffices: rep.field_offices?.map((office) => ({
      phone: office.phone,
      city: office.city,
    })),
  };
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
    // Use local API route to handle authentication
    const response = await fetch(`/api/representatives?zip=${zip5}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: FiveCallsResponse = await response.json();

    if (data.error) {
      return {
        representatives: [],
        error: data.error,
      };
    }

    if (!data.representatives || data.representatives.length === 0) {
      return {
        representatives: [],
        error: 'No representatives found for this ZIP code. Please verify the ZIP code is correct.',
      };
    }

    // Transform and filter to federal representatives only
    const representatives: Representative[] = data.representatives
      .filter((rep) => rep.area === 'US House' || rep.area === 'US Senate')
      .map(transformRepresentative);

    // Sort: Senators first, then House Representatives
    representatives.sort((a, b) => {
      const aIsSenator = a.area === 'US Senate';
      const bIsSenator = b.area === 'US Senate';
      if (aIsSenator && !bIsSenator) return -1;
      if (!aIsSenator && bIsSenator) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      representatives,
      location: data.location,
      state: data.state,
      district: data.district,
      lowAccuracy: data.lowAccuracy,
    };
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return {
      representatives: [],
      error: 'Unable to fetch representative information. Please try again later.',
    };
  }
}
