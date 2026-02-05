/**
 * Message generation utilities
 * Generates respectful, issue-based messages for representative contact forms.
 */

import type { Issue } from '@/data/issues';
import type { GeneratedMessage, Representative } from './types';

/**
 * Generates a subject line based on selected issues
 */
function generateSubject(issues: Issue[]): string {
  if (issues.length === 0) {
    return 'Message from a Concerned Constituent';
  }

  if (issues.length === 1) {
    return `Constituent Request: ${issues[0].title}`;
  }

  if (issues.length === 2) {
    return `Constituent Priorities: ${issues[0].title} and ${issues[1].title}`;
  }

  return `Constituent Priorities: ${issues[0].title} and ${issues.length - 1} Other Issues`;
}

/**
 * Generates the salutation for contact form messages
 * Since users submit to one contact form at a time, we use a generic
 * salutation that works for any individual representative.
 */
function generateSalutation(): string {
  // Generic salutation works for both Senators and Representatives
  // Users can personalize this when they paste into the contact form
  return 'Dear Senator or Representative,';
}

/**
 * Generates the opening paragraph
 */
function generateOpening(): string {
  return 'I am writing to you as your constituent to demand action on the issues below. These are not abstract policy questions. They are crises affecting real people in your district right now, and I expect you to treat them with the urgency they deserve.';
}

/**
 * Generates the closing paragraph
 */
function generateClosing(): string {
  return `I am not writing to start a conversation. I am writing because people are suffering and you have the power to act. I will be watching your votes, your public statements, and your priorities closely, and so will your other constituents. Represent us, or we will find someone who will.

[Your Name]
[Your Address]
[Your City, State ZIP]`;
}

/**
 * Generates a complete message based on selected issues
 */
export function generateMessage(
  selectedIssues: Issue[],
  _representatives: Representative[]
): GeneratedMessage {
  // 'to' field is empty since users submit via contact forms
  const to = '';

  const subject = generateSubject(selectedIssues);

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
      bodyParts.push(issue.messageParagraph);
      bodyParts.push('');
    }
  } else {
    bodyParts.push(
      'I am reaching out to ensure my voice is heard on the issues that matter most to our community. I encourage you to prioritize the needs of your constituents in all legislative decisions.'
    );
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
