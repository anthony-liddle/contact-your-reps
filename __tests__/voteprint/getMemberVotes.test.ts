import { getMemberVotes } from '@/lib/voteprint';
import bradShermanFixture from '@/lib/voteprint/__fixtures__/brad-sherman.json';

// fetchMemberVotes is the only I/O boundary — mock it at the module level
jest.mock('@/lib/voteprint/fetchMemberVotes', () => ({
  fetchMemberVotes: jest.fn(),
}));

import { fetchMemberVotes } from '@/lib/voteprint/fetchMemberVotes';

const mockFetchMemberVotes = fetchMemberVotes as jest.MockedFunction<
  typeof fetchMemberVotes
>;

describe('getMemberVotes', () => {
  beforeEach(() => {
    // Cast needed because fixture JSON lacks strict literal types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFetchMemberVotes.mockResolvedValue(bradShermanFixture as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls fetchMemberVotes with the provided bioguideId', async () => {
    await getMemberVotes('S000344', 'Democrat');
    expect(mockFetchMemberVotes).toHaveBeenCalledWith('S000344', undefined);
  });

  it('passes through the congress parameter', async () => {
    await getMemberVotes('S000344', 'Democrat', 118);
    expect(mockFetchMemberVotes).toHaveBeenCalledWith('S000344', 118);
  });

  it('returns Vote objects with normalized position and result', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    for (const vote of votes) {
      expect(['yea', 'nay', 'absent']).toContain(vote.position);
      expect(['passed', 'failed']).toContain(vote.result);
    }
  });

  it('returns votes sorted by date descending', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    const dates = votes.map((v) => new Date(v.date).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it('derives partyMajority for Democrat votes', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    // All fixture votes have non-zero party totals, so partyMajority should be resolved
    for (const vote of votes) {
      expect(['yea', 'nay', null]).toContain(vote.partyMajority);
    }
  });

  it('enriches votes with category data from vote-mappings.json', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    // roll call 240 is mapped to student-debt in vote-mappings.json
    const roll240 = votes.find((v) => v.rollCall === 240);
    expect(roll240?.category).toBe('student-debt');
  });

  it('leaves unmapped votes with null category and empty note', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    const unmapped = votes.filter((v) => v.category === null);
    for (const vote of unmapped) {
      expect(vote.note).toBe('');
    }
  });

  it('includes isPartyBreak on every vote', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    for (const vote of votes) {
      expect(typeof vote.isPartyBreak).toBe('boolean');
    }
  });

  it('returns an array of the same length as the fixture', async () => {
    const votes = await getMemberVotes('S000344', 'Democrat');
    expect(votes).toHaveLength(bradShermanFixture.length);
  });
});
