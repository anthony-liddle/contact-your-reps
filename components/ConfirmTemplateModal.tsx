'use client';

import { useEffect, useRef } from 'react';
import styles from './ConfirmTemplateModal.module.css';

interface ConfirmTemplateModalProps {
  open: boolean;
  onUpdate: () => void;
  onKeep: () => void;
}

export default function ConfirmTemplateModal({ open, onUpdate, onKeep }: ConfirmTemplateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Sync "Keep my edits" when user presses Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onKeep();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onKeep]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="modal-title">
      <div className={styles.content}>
        <h2 id="modal-title" className={styles.title}>
          Your selections changed
        </h2>
        <p className={styles.body}>
          You&apos;ve edited the message. Would you like to update it to reflect your new issue
          selections, or keep your edits as-is?
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={onUpdate} className={styles.primaryButton}>
            Update message
          </button>
          <button type="button" onClick={onKeep} className={styles.secondaryButton}>
            Keep my edits
          </button>
        </div>
      </div>
    </dialog>
  );
}
