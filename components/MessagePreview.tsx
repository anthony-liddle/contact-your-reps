'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeneratedMessage } from '@/lib/types';
import { formatMessageForClipboard } from '@/lib/message-generator';
import styles from './MessagePreview.module.css';

interface MessagePreviewProps {
  message: GeneratedMessage;
  editedBody: string | null;
  onBodyChange: (body: string) => void;
}

export default function MessagePreview({ message, editedBody, onBodyChange }: MessagePreviewProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const body = editedBody ?? message.body;

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onBodyChange(e.target.value);
  }, [onBodyChange]);

  const handleCopyMessage = useCallback(async () => {
    try {
      const text = formatMessageForClipboard({ ...message, body });
      await navigator.clipboard.writeText(text);
      setCopyStatus('success');
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopyStatus('idle');
    }, 3000);
  }, [message, body]);

  return (
    <section className={styles.container} aria-labelledby="message-preview-heading">
      <h2 id="message-preview-heading" className={styles.heading}>
        Your Generated Message
      </h2>

      <p className={styles.note}>
        Personalize this message before sending. Many offices automatically filter out
        form letters. Adding even one or two sentences in your own words significantly
        increases the chance your message is read.
      </p>

      <div className={styles.messageContainer}>
        {/* Subject field */}
        <div className={styles.field}>
          <label htmlFor="message-subject" className={styles.fieldLabel}>
            Subject:
          </label>
          <input
            type="text"
            id="message-subject"
            value={message.subject}
            readOnly
            className={styles.input}
          />
        </div>

        {/* Body field */}
        <div className={styles.field}>
          <label htmlFor="message-body" className={styles.fieldLabel}>
            Message:
          </label>
          <textarea
            id="message-body"
            value={body}
            onChange={handleBodyChange}
            className={styles.textarea}
            rows={20}
          />
        </div>
      </div>

      {/* Copy actions */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleCopyMessage}
          className={styles.primaryButton}
        >
          <span className={styles.buttonIcon} aria-hidden="true">
            📋
          </span>
          Copy Message to Clipboard
        </button>

        {copyStatus !== 'idle' && (
          <p
            className={`${styles.statusMessage} ${copyStatus === 'success' ? styles.success : styles.error
              }`}
            role="status"
            aria-live="polite"
          >
            {copyStatus === 'success'
              ? '✓ Copied to clipboard!'
              : '✗ Failed to copy. Please try selecting and copying manually.'}
          </p>
        )}
      </div>

      <div className={styles.instructions}>
        <h3 className={styles.instructionsHeading}>Next Steps:</h3>
        <ol className={styles.instructionsList}>
          <li>
            <strong>Personalize the message above.</strong> Add a sentence or two in your
            own words about why this issue matters to you personally
          </li>
          <li>Click the button above to copy your message</li>
          <li>
            Click the <strong>&quot;Website&quot;</strong> link on your
            representative&apos;s card above
          </li>
          <li>Paste your message into their contact form</li>
          <li>Fill in your name, address, and any required fields</li>
          <li>Submit your message!</li>
        </ol>
        <p className={styles.instructionsNote}>
          <strong>Why personalize?</strong> Many congressional offices use software to
          identify and deprioritize form letters. A personal touch makes your message
          stand out and is more likely to be read by staff.
        </p>
      </div>
    </section>
  );
}
