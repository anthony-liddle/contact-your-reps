import { transformVotes } from '@/lib/voteprint/transformVotes';
import type { RawCongressVote } from '@/lib/voteprint/types';

const makeRaw = (overrides: Partial<RawCongressVote> = {}): RawCongressVote => ({
  congress: 119,
  chamber: 'House',
  session: 1,
  rollCall: 100,
  bill: { number: 'H.R. 1', title: 'Test Bill', url: 'https://congress.gov/bill/119/house-bill/1' },
  question: 'On Passage',
  description: '',
  date: '2025-06-15T12:00:00-04:00',
  result: 'Passed',
  voteType: 'Yea-and-Nay',
  memberVote: 'Yea',
  partyTotals: {
    democratic: { yea: 200, nay: 5, notVoting: 3 },
    republican: { yea: 10, nay: 210, notVoting: 2 },
  },
  ...overrides,
});

describe('transformVotes', () => {
  describe('position normalization', () => {
    it('normalizes "Yea" to "yea"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Yea' })], 'Democrat');
      expect(vote.position).toBe('yea');
    });

    it('normalizes "Yes" to "yea"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Yes' })], 'Democrat');
      expect(vote.position).toBe('yea');
    });

    it('normalizes "Nay" to "nay"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Nay' })], 'Democrat');
      expect(vote.position).toBe('nay');
    });

    it('normalizes "No" to "nay"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'No' })], 'Democrat');
      expect(vote.position).toBe('nay');
    });

    it('normalizes "Not Voting" to "absent"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Not Voting' })], 'Democrat');
      expect(vote.position).toBe('absent');
    });

    it('normalizes "Present" to "absent"', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Present' })], 'Democrat');
      expect(vote.position).toBe('absent');
    });
  });

  describe('result normalization', () => {
    it('normalizes "Passed" to "passed"', () => {
      const [vote] = transformVotes([makeRaw({ result: 'Passed' })], 'Democrat');
      expect(vote.result).toBe('passed');
    });

    it('normalizes "Agreed to" to "passed"', () => {
      const [vote] = transformVotes([makeRaw({ result: 'Agreed to' })], 'Democrat');
      expect(vote.result).toBe('passed');
    });

    it('normalizes "Failed" to "failed"', () => {
      const [vote] = transformVotes([makeRaw({ result: 'Failed' })], 'Democrat');
      expect(vote.result).toBe('failed');
    });

    it('normalizes unknown result values to "failed"', () => {
      const [vote] = transformVotes([makeRaw({ result: 'Vetoed' })], 'Democrat');
      expect(vote.result).toBe('failed');
    });
  });

  describe('partyMajority derivation', () => {
    it('returns "yea" for Democrat when Dems voted mostly yea', () => {
      const raw = makeRaw({
        partyTotals: { democratic: { yea: 200, nay: 5, notVoting: 3 }, republican: { yea: 5, nay: 215, notVoting: 2 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.partyMajority).toBe('yea');
    });

    it('returns "nay" for Democrat when Dems voted mostly nay', () => {
      const raw = makeRaw({
        partyTotals: { democratic: { yea: 3, nay: 200, notVoting: 5 }, republican: { yea: 218, nay: 2, notVoting: 2 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.partyMajority).toBe('nay');
    });

    it('returns "yea" for Republican when Republicans voted mostly yea', () => {
      const raw = makeRaw({
        partyTotals: { democratic: { yea: 5, nay: 198, notVoting: 5 }, republican: { yea: 215, nay: 3, notVoting: 4 } },
      });
      const [vote] = transformVotes([raw], 'Republican');
      expect(vote.partyMajority).toBe('yea');
    });

    it('returns null for Independent members', () => {
      const [vote] = transformVotes([makeRaw()], 'Independent');
      expect(vote.partyMajority).toBeNull();
    });

    it('returns null when yea and nay counts are tied', () => {
      const raw = makeRaw({
        partyTotals: { democratic: { yea: 100, nay: 100, notVoting: 8 }, republican: { yea: 0, nay: 0, notVoting: 0 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.partyMajority).toBeNull();
    });
  });

  describe('isPartyBreak derivation', () => {
    it('is true when a Democrat votes nay while the party majority was yea', () => {
      const raw = makeRaw({
        memberVote: 'Nay',
        partyTotals: { democratic: { yea: 200, nay: 5, notVoting: 3 }, republican: { yea: 5, nay: 215, notVoting: 2 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.isPartyBreak).toBe(true);
    });

    it('is false when a Democrat votes yea with the party majority of yea', () => {
      const raw = makeRaw({
        memberVote: 'Yea',
        partyTotals: { democratic: { yea: 200, nay: 5, notVoting: 3 }, republican: { yea: 5, nay: 215, notVoting: 2 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.isPartyBreak).toBe(false);
    });

    it('is false when the member was absent (Not Voting)', () => {
      const raw = makeRaw({
        memberVote: 'Not Voting',
        partyTotals: { democratic: { yea: 200, nay: 5, notVoting: 3 }, republican: { yea: 5, nay: 215, notVoting: 2 } },
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.isPartyBreak).toBe(false);
    });

    it('is false for Independent members (partyMajority is null)', () => {
      const [vote] = transformVotes([makeRaw({ memberVote: 'Yea' })], 'Independent');
      expect(vote.isPartyBreak).toBe(false);
    });
  });

  describe('sorting', () => {
    it('sorts votes by date descending (most recent first)', () => {
      const raw = [
        makeRaw({ rollCall: 1, date: '2025-01-01T00:00:00Z' }),
        makeRaw({ rollCall: 3, date: '2025-03-01T00:00:00Z' }),
        makeRaw({ rollCall: 2, date: '2025-02-01T00:00:00Z' }),
      ];
      const votes = transformVotes(raw, 'Democrat');
      expect(votes.map((v) => v.rollCall)).toEqual([3, 2, 1]);
    });
  });

  describe('passthrough fields', () => {
    it('preserves non-normalized fields from the raw vote', () => {
      const raw = makeRaw({
        congress: 118,
        session: 2,
        rollCall: 42,
        bill: { number: 'H.R. 99', title: '', url: 'https://congress.gov' },
        question: 'On Agreeing to the Amendment',
        voteType: 'Recorded Vote',
        date: '2024-11-10T10:00:00Z',
      });
      const [vote] = transformVotes([raw], 'Democrat');
      expect(vote.congress).toBe(118);
      expect(vote.session).toBe(2);
      expect(vote.rollCall).toBe(42);
      expect(vote.question).toBe('On Agreeing to the Amendment');
      expect(vote.voteType).toBe('Recorded Vote');
      expect(vote.bill?.number).toBe('H.R. 99');
    });

    it('preserves null bill for procedural votes', () => {
      const [vote] = transformVotes([makeRaw({ bill: null })], 'Democrat');
      expect(vote.bill).toBeNull();
    });
  });

  describe('empty input', () => {
    it('returns an empty array for empty input', () => {
      expect(transformVotes([], 'Democrat')).toEqual([]);
    });
  });
});

describe('transformVotes — alignedWithIssue field', () => {
  // Roll call 245 is mapped with stance: "for" (restores EPA methane reporting)
  it('produces alignedWithIssue true for a "for"-stance vote with Yea position', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Yea' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBe(true);
  });

  it('produces alignedWithIssue false for a "for"-stance vote with Nay position', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Nay' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBe(false);
  });

  it('produces alignedWithIssue null for an unmapped vote', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 99999, memberVote: 'Yea' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBeNull();
  });

  it('produces alignedWithIssue null for an absent vote on a mapped roll call', () => {
    const [vote] = transformVotes(
      [makeRaw({ rollCall: 245, memberVote: 'Not Voting' })],
      'Democrat',
    );
    expect(vote.alignedWithIssue).toBeNull();
  });
});
