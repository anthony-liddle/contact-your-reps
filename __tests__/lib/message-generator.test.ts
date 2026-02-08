import { generateMessage, formatMessageForClipboard } from '@/lib/message-generator';
import type { Issue } from '@/data/issues';
import type { Representative } from '@/lib/types';
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
