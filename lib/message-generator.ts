/**
 * Message generation utilities
 * Generates respectful, issue-based messages for representative contact forms.
 */

import { issues } from '@/data/issues';
import type { Issue } from '@/data/issues';
import type { GeneratedMessage, Representative, VoteContext } from './types';

export const MESSAGE_SALUTATION = 'Dear Senator or Representative,';
export const MESSAGE_OPENING = 'I am writing to you as your constituent to demand action on the issues below. These are not abstract policy questions. They are crises affecting real people in your district right now, and I expect you to treat them with the urgency they deserve.';
export const MESSAGE_GENERIC = 'I am writing because I expect you to fight for the people in your district, not donors, not party leadership, and not your own career. I will be paying close attention to your votes and public positions, and I will hold you accountable at the ballot box.';
export const MESSAGE_CLOSING = 'I am not writing to start a conversation. I am writing because people are suffering and you have the power to act. I will be watching your votes, your public statements, and your priorities closely, and so will your other constituents. Represent us, or we will find someone who will.';

/**
 * Generates a subject line based on selected issues
 */
function generateSubject(selectedIssues: Issue[]): string {
  if (selectedIssues.length === 0) {
    return 'Message from a Concerned Constituent';
  }

  if (selectedIssues.length === 1) {
    return `Constituent Request: ${selectedIssues[0].title}`;
  }

  if (selectedIssues.length === 2) {
    return `Constituent Priorities: ${selectedIssues[0].title} and ${selectedIssues[1].title}`;
  }

  return `Constituent Priorities: ${selectedIssues[0].title} and ${selectedIssues.length - 1} Other Issues`;
}

/**
 * Generates the salutation for contact form messages
 * Since users submit to one contact form at a time, we use a generic
 * salutation that works for any individual representative.
 */
function generateSalutation(): string {
  // Generic salutation works for both Senators and Representatives
  // Users can personalize this when they paste into the contact form
  return MESSAGE_SALUTATION;
}

/**
 * Generates the opening paragraph
 */
function generateOpening(): string {
  return MESSAGE_OPENING
}

/**
 * Generates the closing paragraph
 */
function generateClosing(): string {
  return `${MESSAGE_CLOSING}

[Your Name]
[Your Address]
[Your City, State ZIP]`;
}

/** Maps a category ID to its human-readable title from data/issues.ts. */
function getCategoryLabel(categoryId: string): string {
  return issues.find((i) => i.id === categoryId)?.title ?? categoryId;
}

function formatVoteDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Builds 1–3 sentences referencing the representative's actual votes on an issue.
 * Exported for direct testing.
 */
export function generateVoteReference(context: VoteContext, _repName: string): string {
  const categoryLabel = getCategoryLabel(context.category);
  const votes = context.votes.slice(0, 3);

  const allAligned = votes.every((v) => v.alignedWithIssue === true);
  const allAgainst = votes.every((v) => v.alignedWithIssue === false);
  const anyAgainst = votes.some((v) => v.alignedWithIssue === false);

  let opening: string;
  if (allAligned) {
    opening = `Your voting record on ${categoryLabel} shows consistent support for this issue.`;
  } else if (allAgainst) {
    opening = `Your voting record on ${categoryLabel} is a direct attack on the people you represent.`;
  } else {
    opening = `Your record on ${categoryLabel} is mixed.`;
  }

  const sentences = votes.map((entry) => {
    const dateStr = formatVoteDate(entry.date);
    const posLabel = entry.position === 'yea' ? 'yes' : entry.position === 'nay' ? 'no' : entry.position;
    // Prefer billTitle; fall back to note for better context
    const displayTitle = entry.billTitle || entry.note;
    const cleanTitle = displayTitle.replace(/\.+$/, '');
    const billRef = `${entry.billNumber}${cleanTitle ? `, the ${cleanTitle}` : ''}`;

    if (entry.alignedWithIssue === true) {
      return `On ${dateStr}, you stood with ${categoryLabel} by voting ${posLabel} on ${billRef}.`;
    }
    return `On ${dateStr}, you voted against ${categoryLabel} by voting ${posLabel} on ${billRef}.`;
  });

  const parts = [opening, ...sentences];
  if (anyAgainst) {
    parts.push('I expect you to do better.');
  }

  return parts.join(' ');
}

/**
 * Generates a complete message based on selected issues.
 * When voteContext is provided and matches a selected issue, a vote reference
 * paragraph is prepended to that issue's message paragraph.
 */
export function generateMessage(
  selectedIssues: Issue[],
  _representatives: Representative[],
  voteContext?: VoteContext | null
): GeneratedMessage {
  // 'to' field is empty since users submit via contact forms
  const to = '';

  const subject = voteContext
    ? `Constituent Concerns: ${getCategoryLabel(voteContext.category)} Voting Record`
    : generateSubject(selectedIssues);

  const bodyParts: string[] = [];

  // Salutation
  bodyParts.push(generateSalutation());
  bodyParts.push('');

  // Opening
  bodyParts.push(generateOpening());
  bodyParts.push('');

  // Issue paragraphs
  if (selectedIssues.length > 0) {
    for (const issue of selectedIssues) {
      if (voteContext && issue.id === voteContext.category && voteContext.votes.length > 0) {
        const ref = generateVoteReference(voteContext, voteContext.repName);
        bodyParts.push(`${ref}\n\n${issue.messageParagraph}`);
      } else {
        bodyParts.push(issue.messageParagraph);
      }
      bodyParts.push('');
    }
  } else {
    bodyParts.push(MESSAGE_GENERIC);
    bodyParts.push('');
  }

  // Closing
  bodyParts.push(generateClosing());

  const body = bodyParts.join('\n');

  return { to, subject, body };
}

/**
 * Formats the message for copying to clipboard
 */
export function formatMessageForClipboard(message: GeneratedMessage): string {
  const parts: string[] = [];

  if (message.to) {
    parts.push(`To: ${message.to}`);
  }

  parts.push(`Subject: ${message.subject}`);
  parts.push('');
  parts.push(message.body);

  return parts.join('\n');
}
