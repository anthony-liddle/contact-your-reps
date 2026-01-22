'use client';

import { useCallback } from 'react';
import type { Issue } from '@/data/issues';
import styles from './IssueSelector.module.css';

interface IssueSelectorProps {
  issues: Issue[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export default function IssueSelector({
  issues,
  selectedIds,
  onSelectionChange,
}: IssueSelectorProps) {
  const handleChange = useCallback(
    (issueId: string, checked: boolean) => {
      const newSelection = new Set(selectedIds);
      if (checked) {
        newSelection.add(issueId);
      } else {
        newSelection.delete(issueId);
      }
      onSelectionChange(newSelection);
    },
    [selectedIds, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === issues.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(issues.map((i) => i.id)));
    }
  }, [issues, selectedIds, onSelectionChange]);

  const allSelected = selectedIds.size === issues.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < issues.length;

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        Select the issues you care about
        <span className={styles.selectedCount}>
          ({selectedIds.size} of {issues.length} selected)
        </span>
      </legend>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={handleSelectAll}
          className={styles.selectAllButton}
          aria-pressed={allSelected}
        >
          {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
        </button>
      </div>

      <div className={styles.issueList} role="group" aria-label="Issue checkboxes">
        {issues.map((issue) => (
          <label
            key={issue.id}
            className={`${styles.issueItem} ${selectedIds.has(issue.id) ? styles.selected : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(issue.id)}
              onChange={(e) => handleChange(issue.id, e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxCustom} aria-hidden="true">
              {selectedIds.has(issue.id) && (
                <svg viewBox="0 0 24 24" className={styles.checkIcon}>
                  <path
                    fill="currentColor"
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                  />
                </svg>
              )}
            </span>
            <span className={styles.issueContent}>
              <span className={styles.issueTitle}>{issue.title}</span>
              {issue.description && (
                <span className={styles.issueDescription}>{issue.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
