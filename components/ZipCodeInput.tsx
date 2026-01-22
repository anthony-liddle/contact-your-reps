'use client';

import { useState, useCallback } from 'react';
import { isValidZipCode } from '@/lib/civic-api';
import styles from './ZipCodeInput.module.css';

interface ZipCodeInputProps {
  onSubmit: (zipCode: string) => void;
  isLoading?: boolean;
  error?: string;
}

export default function ZipCodeInput({
  onSubmit,
  isLoading = false,
  error,
}: ZipCodeInputProps) {
  const [zipCode, setZipCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^\d-]/g, '');
      setZipCode(value);
      if (validationError) {
        setValidationError(null);
      }
    },
    [validationError]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!zipCode.trim()) {
        setValidationError('Please enter your ZIP code.');
        return;
      }

      if (!isValidZipCode(zipCode)) {
        setValidationError('Please enter a valid 5-digit U.S. ZIP code.');
        return;
      }

      setValidationError(null);
      onSubmit(zipCode.trim());
    },
    [zipCode, onSubmit]
  );

  const displayError = validationError || error;
  const inputId = 'zip-code-input';
  const errorId = 'zip-code-error';

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor={inputId} className={styles.label}>
          Enter your U.S. ZIP code
        </label>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            id={inputId}
            name="zipCode"
            value={zipCode}
            onChange={handleChange}
            placeholder="e.g., 90210"
            maxLength={10}
            inputMode="numeric"
            autoComplete="postal-code"
            aria-describedby={displayError ? errorId : undefined}
            aria-invalid={displayError ? 'true' : undefined}
            className={`${styles.input} ${displayError ? styles.inputError : ''}`}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <span className={styles.srOnly}>Loading...</span>
                <span aria-hidden="true">Finding...</span>
              </>
            ) : (
              'Find My Representatives'
            )}
          </button>
        </div>
        {displayError && (
          <p id={errorId} className={styles.error} role="alert">
            {displayError}
          </p>
        )}
      </div>
    </form>
  );
}
