import { fetchLegislatorsData, findLegislator } from '@/lib/legislators-data';
import type { LegislatorInfo } from '@/lib/legislators-data';

const mockLegislators: LegislatorInfo[] = [
  {
    bioguideId: 'S000033',
    firstName: 'Bernard',
    lastName: 'Sanders',
    officialFullName: 'Bernard Sanders',
    state: 'VT',
    type: 'sen',
    party: 'Independent',
    websiteUrl: 'https://sanders.senate.gov',
  },
  {
    bioguideId: 'W000779',
    firstName: 'Ron',
    lastName: 'Wyden',
    officialFullName: 'Ron Wyden',
    state: 'OR',
    type: 'sen',
    party: 'Democrat',
    websiteUrl: 'https://wyden.senate.gov',
  },
];

describe('findLegislator', () => {
  it('finds legislator by exact official full name', () => {
    const result = findLegislator('Bernard Sanders', 'VT', mockLegislators);
    expect(result).not.toBeNull();
    expect(result?.bioguideId).toBe('S000033');
  });

  it('finds legislator by first + last name', () => {
    const result = findLegislator('Ron Wyden', 'OR', mockLegislators);
    expect(result).not.toBeNull();
    expect(result?.bioguideId).toBe('W000779');
  });

  it('returns null when state does not match', () => {
    const result = findLegislator('Ron Wyden', 'CA', mockLegislators);
    expect(result).toBeNull();
  });

  it('returns null when name does not match any legislator', () => {
    const result = findLegislator('Unknown Person', 'OR', mockLegislators);
    expect(result).toBeNull();
  });

  it('is case-insensitive for state matching', () => {
    const result = findLegislator('Ron Wyden', 'or', mockLegislators);
    expect(result).not.toBeNull();
  });

  it('handles name normalization (extra spaces)', () => {
    const result = findLegislator('Ron  Wyden', 'OR', mockLegislators);
    expect(result).not.toBeNull();
  });
});

describe('fetchLegislatorsData', () => {
  const CACHE_KEY = 'congress-legislators-data';

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: { bioguide: 'W000779' },
            name: { first: 'Ron', last: 'Wyden', official_full: 'Ron Wyden' },
            bio: {},
            terms: [
              {
                type: 'sen',
                start: '2023-01-03',
                end: '2029-01-03',
                state: 'OR',
                party: 'Democrat',
                url: 'https://wyden.senate.gov',
              },
            ],
          },
        ]),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches and returns legislators from API', async () => {
    const legislators = await fetchLegislatorsData();
    expect(legislators).toHaveLength(1);
    expect(legislators[0].lastName).toBe('Wyden');
  });

  it('uses cached data when cache is fresh', async () => {
    const cacheData = {
      timestamp: Date.now(),
      legislators: mockLegislators,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    const legislators = await fetchLegislatorsData();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(legislators).toHaveLength(mockLegislators.length);
  });

  it('re-fetches when cache is expired', async () => {
    const cacheData = {
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      legislators: mockLegislators,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    await fetchLegislatorsData();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('returns empty array on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    localStorage.clear(); // ensure no cache
    const legislators = await fetchLegislatorsData();
    expect(legislators).toEqual([]);
  });
});
