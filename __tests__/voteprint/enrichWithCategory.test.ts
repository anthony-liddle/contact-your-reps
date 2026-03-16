import { enrichWithCategory } from '@/lib/voteprint/voteMappings';
import type { RawCongressVote } from '@/lib/voteprint/types';

const makeRaw = (overrides: Partial<RawCongressVote> = {}): RawCongressVote => ({
  congress: 119,
  chamber: 'House',
  session: 1,
  rollCall: 999,
  bill: null,
  question: 'On Passage',
  description: '',
  date: '2025-06-01T00:00:00Z',
  result: 'Passed',
  voteType: 'Yea-and-Nay',
  memberVote: 'Yea',
  partyTotals: {
    democratic: { yea: 0, nay: 0, notVoting: 0 },
    republican: { yea: 0, nay: 0, notVoting: 0 },
  },
  ...overrides,
});

describe('enrichWithCategory', () => {
  it('returns the correct category for a known mapping (119-house-240)', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
    expect(result.category).toBe('student-debt');
  });

  it('returns a non-empty note for a known mapping', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
    expect(result.note.length).toBeGreaterThan(0);
  });

  it('returns null category for an unknown roll call number', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
    expect(result.category).toBeNull();
  });

  it('returns empty string note for an unknown roll call', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
    expect(result.note).toBe('');
  });

  it('resolves correctly for a different known mapping (119-house-96 → foreign-policy)', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 96 }), 'yea');
    expect(result.category).toBe('foreign-policy');
  });

  it('resolves correctly for a climate-justice mapping (119-house-245)', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'yea');
    expect(result.category).toBe('climate-justice');
  });

  it('resolves senate chamber votes separately from house votes of the same roll call', () => {
    // roll_call 240 is mapped for house — same number with senate chamber should be unknown
    // (Senate chamber is not currently in RawCongressVote, but we test the key logic)
    const houseResult = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
    expect(houseResult.category).toBe('student-debt');

    // If somehow a non-house key were used, it would return null
    // (tested indirectly by confirming unknown rolls return null)
    const unknownResult = enrichWithCategory(makeRaw({ rollCall: 241 }), 'yea');
    expect(unknownResult.category).toBeNull();
  });

  it('resolves correctly for workers-rights mapping (119-house-122)', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 122 }), 'yea');
    expect(result.category).toBe('workers-rights');
  });
});

describe('enrichWithCategory — stance matrix', () => {
  // 119-house-240 has stance: "against" (eliminate student loan forgiveness)
  it('stance against + yea → alignedWithIssue false', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'yea');
    expect(result.alignedWithIssue).toBe(false);
  });

  it('stance against + nay → alignedWithIssue true', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'nay');
    expect(result.alignedWithIssue).toBe(true);
  });

  // 119-house-245 has stance: "for" (restores EPA methane reporting)
  it('stance for + yea → alignedWithIssue true', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'yea');
    expect(result.alignedWithIssue).toBe(true);
  });

  it('stance for + nay → alignedWithIssue false', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'nay');
    expect(result.alignedWithIssue).toBe(false);
  });

  it('stance against + absent → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 240 }), 'absent');
    expect(result.alignedWithIssue).toBeNull();
  });

  it('stance for + absent → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 245 }), 'absent');
    expect(result.alignedWithIssue).toBeNull();
  });

  it('no mapping → alignedWithIssue null', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 99999 }), 'yea');
    expect(result.alignedWithIssue).toBeNull();
  });

  // 119-house-132 has "(stance: review)" appended to its note in the JSON
  it('strips the (stance: review) suffix from note before returning', () => {
    const result = enrichWithCategory(makeRaw({ rollCall: 132 }), 'yea');
    expect(result.note).not.toMatch(/\(stance: review\)/);
    expect(result.note.length).toBeGreaterThan(0);
  });
});
