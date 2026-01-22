'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeneratedMessage } from '@/lib/types';
import { formatMessageForClipboard } from '@/lib/message-generator';
import styles from './MessagePreview.module.css';

interface MessagePreviewProps {
  message: GeneratedMessage;
}

export default function MessagePreview({ message }: MessagePreviewProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopyMessage = useCallback(async () => {
    try {
      const text = formatMessageForClipboard(message);
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
  }, [message]);

  return (
    <section className={styles.container} aria-labelledby="message-preview-heading">
      <h2 id="message-preview-heading" className={styles.heading}>
        Your Generated Message
      </h2>

      <p className={styles.note}>
        Copy this message and paste it into your representative&apos;s contact form.
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
            value={message.body}
            readOnly
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
            className={`${styles.statusMessage} ${
              copyStatus === 'success' ? styles.success : styles.error
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
          <li>Click the button above to copy your message</li>
          <li>
            Click the <strong>&quot;Official Contact Form&quot;</strong> link on your
            representative&apos;s card above
          </li>
          <li>Paste your message into their contact form</li>
          <li>
            Fill in your name, address, and any required fields
          </li>
          <li>Review and personalize the message if desired</li>
          <li>Submit your message!</li>
        </ol>
        <p className={styles.instructionsNote}>
          <strong>Why contact forms?</strong> Most representatives prefer constituents
          use their official contact forms to verify you live in their district.
        </p>
      </div>
    </section>
  );
}
