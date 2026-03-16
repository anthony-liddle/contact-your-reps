import { generateMessage, generateVoteReference, formatMessageForClipboard } from '@/lib/message-generator';
import type { Issue } from '@/data/issues';
import type { Representative, VoteContext } from '@/lib/types';
import { MESSAGE_SALUTATION, MESSAGE_OPENING, MESSAGE_GENERIC, MESSAGE_CLOSING } from '@/lib/message-generator';

const mockIssues: Issue[] = [
  {
    id: 'test-issue-1',
    title: 'Test Issue One',
    description: 'First test issue',
    messageParagraph: 'This is the first test issue paragraph.',
  },
  {
    id: 'test-issue-2',
    title: 'Test Issue Two',
    description: 'Second test issue',
    messageParagraph: 'This is the second test issue paragraph.',
  },
  {
    id: 'test-issue-3',
    title: 'Test Issue Three',
    description: 'Third test issue',
    messageParagraph: 'This is the third test issue paragraph.',
  },
];

const mockRepresentatives: Representative[] = [
  {
    id: 'rep-1',
    name: 'Jane Doe',
    phone: '202-555-0100',
    url: 'https://example.gov/contact',
    party: 'D',
    state: 'CA',
    reason: 'You live in their district',
    area: 'US Senate',
  },
];

describe('generateMessage', () => {
  describe('subject line generation', () => {
    it('generates default subject with no issues', () => {
      const result = generateMessage([], mockRepresentatives);
      expect(result.subject).toBe('Message from a Concerned Constituent');
    });

    it('generates subject with single issue', () => {
      const result = generateMessage([mockIssues[0]], mockRepresentatives);
      expect(result.subject).toBe('Constituent Request: Test Issue One');
    });

    it('generates subject with two issues', () => {
      const result = generateMessage([mockIssues[0], mockIssues[1]], mockRepresentatives);
      expect(result.subject).toBe('Constituent Priorities: Test Issue One and Test Issue Two');
    });

    it('generates subject with more than two issues', () => {
      const result = generateMessage(mockIssues, mockRepresentatives);
      expect(result.subject).toBe('Constituent Priorities: Test Issue One and 2 Other Issues');
    });
  });

  describe('message body generation', () => {
    it('includes salutation', () => {
      const result = generateMessage([], mockRepresentatives);
      expect(result.body).toContain(MESSAGE_SALUTATION);
    });

    it('includes opening paragraph', () => {
      const result = generateMessage([], mockRepresentatives);
      expect(result.body).toContain(MESSAGE_OPENING);
    });

    it('includes closing with signature placeholders', () => {
      const result = generateMessage([], mockRepresentatives);
      expect(result.body).toContain(MESSAGE_CLOSING);
      expect(result.body).toContain('[Your Name]');
      expect(result.body).toContain('[Your Address]');
    });

    it('includes issue paragraphs when issues are selected', () => {
      const result = generateMessage([mockIssues[0]], mockRepresentatives);
      expect(result.body).toContain('This is the first test issue paragraph.');
    });

    it('includes all selected issue paragraphs', () => {
      const result = generateMessage([mockIssues[0], mockIssues[1]], mockRepresentatives);
      expect(result.body).toContain('This is the first test issue paragraph.');
      expect(result.body).toContain('This is the second test issue paragraph.');
    });

    it('includes generic paragraph when no issues selected', () => {
      const result = generateMessage([], mockRepresentatives);
      expect(result.body).toContain(MESSAGE_GENERIC);
    });
  });

  describe('to field', () => {
    it('returns empty to field (users submit via contact forms)', () => {
      const result = generateMessage(mockIssues, mockRepresentatives);
      expect(result.to).toBe('');
    });
  });
});

describe('formatMessageForClipboard', () => {
  it('formats message with subject and body', () => {
    const message = {
      to: '',
      subject: 'Test Subject',
      body: 'Test body content',
    };
    const result = formatMessageForClipboard(message);
    expect(result).toContain('Subject: Test Subject');
    expect(result).toContain('Test body content');
  });

  it('includes to field when present', () => {
    const message = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test body content',
    };
    const result = formatMessageForClipboard(message);
    expect(result).toContain('To: test@example.com');
  });

  it('omits to field when empty', () => {
    const message = {
      to: '',
      subject: 'Test Subject',
      body: 'Test body content',
    };
    const result = formatMessageForClipboard(message);
    expect(result).not.toContain('To:');
  });
});

// ── generateVoteReference ──────────────────────────────────────────────────

const baseVoteContext: VoteContext = {
  category: 'trans-rights',
  repId: 'rep-bonamici',
  repName: 'Suzanne Bonamici',
  votes: [],
};

function makeEntry(
  overrides: Partial<{
    billNumber: string;
    billTitle: string;
    date: string;
    position: 'yea' | 'nay' | 'absent';
    alignedWithIssue: boolean | null;
    note: string;
  }> = {},
) {
  return {
    billNumber: 'H.R. 5184',
    billTitle: 'Protection of Women and Girls in Sports Act',
    question: 'On Passage',
    date: '2026-01-09',
    position: 'yea' as const,
    alignedWithIssue: false as boolean | null,
    note: '',
    ...overrides,
  };
}

describe('generateVoteReference', () => {
  it('opens with all-against sentence when every vote is opposed to the issue', () => {
    const ctx = {
      ...baseVoteContext,
      votes: [
        makeEntry({ alignedWithIssue: false }),
        makeEntry({ date: '2026-01-08', billNumber: 'H.R. 1834', billTitle: '', alignedWithIssue: false }),
      ],
    };
    const result = generateVoteReference(ctx, ctx.repName);
    expect(result).toContain('is a direct attack on the people you represent');
  });

  it('opens with all-aligned sentence when every vote supports the issue', () => {
    const ctx = {
      ...baseVoteContext,
      votes: [
        makeEntry({ position: 'nay', alignedWithIssue: true }),
        makeEntry({ date: '2026-01-08', position: 'nay', alignedWithIssue: true }),
      ],
    };
    const result = generateVoteReference(ctx, ctx.repName);
    expect(result).toContain('shows consistent support for this issue');
  });

  it('opens with mixed sentence when votes are split', () => {
    const ctx = {
      ...baseVoteContext,
      votes: [
        makeEntry({ alignedWithIssue: false }),
        makeEntry({ date: '2026-01-08', position: 'nay', alignedWithIssue: true }),
      ],
    };
    const result = generateVoteReference(ctx, ctx.repName);
    expect(result).toContain('Your record on');
    expect(result).toContain('is mixed');
  });

  it('uses "yes" / "no" instead of "yea" / "nay" for position labels', () => {
    const ctx = { ...baseVoteContext, votes: [makeEntry({ position: 'yea', alignedWithIssue: false })] };
    expect(generateVoteReference(ctx, ctx.repName)).toContain('voting yes on');

    const ctx2 = { ...baseVoteContext, votes: [makeEntry({ position: 'nay', alignedWithIssue: true })] };
    expect(generateVoteReference(ctx2, ctx2.repName)).toContain('voting no on');
  });

  it('uses "stood with" phrasing for aligned votes', () => {
    const ctx = { ...baseVoteContext, votes: [makeEntry({ position: 'nay', alignedWithIssue: true })] };
    expect(generateVoteReference(ctx, ctx.repName)).toContain('you stood with');
  });

  it('uses "voted against" phrasing for opposed votes', () => {
    const ctx = { ...baseVoteContext, votes: [makeEntry({ alignedWithIssue: false })] };
    expect(generateVoteReference(ctx, ctx.repName)).toContain('you voted against');
  });

  it('includes bill number and title in vote sentences', () => {
    const ctx = { ...baseVoteContext, votes: [makeEntry()] };
    const result = generateVoteReference(ctx, ctx.repName);
    expect(result).toContain('H.R. 5184');
    expect(result).toContain('the Protection of Women and Girls in Sports Act');
  });

  it('falls back to note when billTitle is empty', () => {
    const ctx = {
      ...baseVoteContext,
      votes: [makeEntry({ billTitle: '', note: 'Sports bill context', alignedWithIssue: false })],
    };
    expect(generateVoteReference(ctx, ctx.repName)).toContain('the Sports bill context');
  });

  it('omits title clause when both billTitle and note are empty', () => {
    const ctx = {
      ...baseVoteContext,
      votes: [makeEntry({ billTitle: '', note: '', alignedWithIssue: false })],
    };
    const result = generateVoteReference(ctx, ctx.repName);
    expect(result).toContain('H.R. 5184.');
    expect(result).not.toContain(', the ');
  });

  it('appends "I expect you to do better." only when any vote is against the issue', () => {
    const ctxAgainst = { ...baseVoteContext, votes: [makeEntry({ alignedWithIssue: false })] };
    expect(generateVoteReference(ctxAgainst, ctxAgainst.repName)).toContain('I expect you to do better.');

    const ctxAligned = { ...baseVoteContext, votes: [makeEntry({ position: 'nay', alignedWithIssue: true })] };
    expect(generateVoteReference(ctxAligned, ctxAligned.repName)).not.toContain('I expect you to do better.');
  });

  it('formats the date as long month name', () => {
    const ctx = { ...baseVoteContext, votes: [makeEntry({ date: '2026-01-09', alignedWithIssue: false })] };
    expect(generateVoteReference(ctx, ctx.repName)).toContain('January');
  });

  it('uses at most 3 votes', () => {
    const ctx = {
      ...baseVoteContext,
      votes: Array.from({ length: 5 }, (_, i) =>
        makeEntry({ date: `2026-01-0${i + 1}`, alignedWithIssue: false }),
      ),
    };
    const result = generateVoteReference(ctx, ctx.repName);
    // Each vote sentence starts with "On"; count occurrences
    const sentenceCount = (result.match(/\bOn [A-Z]/g) ?? []).length;
    expect(sentenceCount).toBe(3);
  });
});

// ── generateMessage with voteContext ──────────────────────────────────────

const transRightsIssue: Issue = {
  id: 'trans-rights',
  title: 'Protect Transgender People and Trans Youth',
  description: 'Oppose state-sponsored attacks on trans lives',
  messageParagraph: 'Trans people are under direct attack.',
};

describe('generateMessage with voteContext', () => {
  it('prepends vote reference paragraph to the matching issue', () => {
    const ctx: VoteContext = {
      category: 'trans-rights',
      repId: 'rep-bonamici',
      repName: 'Suzanne Bonamici',
      votes: [makeEntry({ position: 'nay', alignedWithIssue: true })],
    };
    const result = generateMessage([transRightsIssue], mockRepresentatives, ctx);
    expect(result.body).toContain('shows consistent support for this issue');
    expect(result.body).toContain('Trans people are under direct attack.');
    // Reference appears before the issue paragraph
    const refPos = result.body.indexOf('shows consistent support');
    const paraPos = result.body.indexOf('Trans people are under direct attack.');
    expect(refPos).toBeLessThan(paraPos);
  });

  it('does not modify paragraphs for other issues', () => {
    const otherIssue: Issue = {
      id: 'climate-justice',
      title: 'Climate Justice',
      description: 'Climate',
      messageParagraph: 'Climate paragraph text.',
    };
    const ctx: VoteContext = {
      category: 'trans-rights',
      repId: 'rep-test',
      repName: 'Test Rep',
      votes: [makeEntry({ alignedWithIssue: false })],
    };
    const result = generateMessage([transRightsIssue, otherIssue], mockRepresentatives, ctx);
    expect(result.body).toContain('Climate paragraph text.');
    // Climate paragraph should appear immediately after a newline — no vote
    // reference injected directly before it (the reference belongs to trans-rights)
    const climatePos = result.body.indexOf('Climate paragraph text.');
    const charBefore = result.body[climatePos - 1];
    expect(charBefore).toBe('\n');
  });

  it('uses vote-context subject line when voteContext is provided', () => {
    const ctx: VoteContext = {
      category: 'trans-rights',
      repId: 'rep-test',
      repName: 'Test Rep',
      votes: [makeEntry({ alignedWithIssue: false })],
    };
    const result = generateMessage([transRightsIssue], mockRepresentatives, ctx);
    expect(result.subject).toBe('Constituent Concerns: Protect Transgender People and Trans Youth Voting Record');
  });

  it('skips vote reference injection when votes array is empty', () => {
    const ctx: VoteContext = {
      category: 'trans-rights',
      repId: 'rep-test',
      repName: 'Test Rep',
      votes: [],
    };
    const result = generateMessage([transRightsIssue], mockRepresentatives, ctx);
    expect(result.body).not.toContain('voting record');
    expect(result.body).toContain('Trans people are under direct attack.');
  });

  it('leaves behavior unchanged when voteContext is null', () => {
    const baseline = generateMessage([mockIssues[0]], mockRepresentatives);
    const withNull = generateMessage([mockIssues[0]], mockRepresentatives, null);
    expect(withNull.subject).toBe(baseline.subject);
    expect(withNull.body).toBe(baseline.body);
  });

  it('leaves behavior unchanged when voteContext is undefined', () => {
    const baseline = generateMessage([mockIssues[0]], mockRepresentatives);
    const withUndefined = generateMessage([mockIssues[0]], mockRepresentatives, undefined);
    expect(withUndefined.subject).toBe(baseline.subject);
    expect(withUndefined.body).toBe(baseline.body);
  });
});
