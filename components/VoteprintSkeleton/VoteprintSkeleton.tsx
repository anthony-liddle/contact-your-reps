/**
 * VoteprintSkeleton — shown as the Suspense fallback while vote data loads,
 * and as the loading UI inside VoteprintLoader during SSE progress streaming.
 *
 * Mirrors the visual structure of VoteprintPanel so the page layout is stable
 * during the fetch. When a `progress` prop is supplied, the loading message
 * updates live and a progress bar appears below it.
 */

import type { ReactNode } from 'react';
import styles from './VoteprintSkeleton.module.css';

type Progress =
  | { fetched: number; total: number | null }
  | 'complete'
  | null
  | undefined;

interface VoteprintSkeletonProps {
  progress?: Progress;
}

function getLoadingContent(progress: Progress): {
  message: string;
  bar: ReactNode;
} {
  if (!progress) {
    return {
      message:
        'Fetching voting record from Congress.gov — this may take up to 60 seconds for a first-time load. Subsequent visits will be instant.',
      bar: null,
    };
  }

  if (progress === 'complete') {
    return {
      message: 'Almost there — processing votes…',
      bar: (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '100%' }} />
        </div>
      ),
    };
  }

  if (progress.total !== null) {
    const pct = Math.min(
      100,
      Math.round((progress.fetched / progress.total) * 100),
    );
    return {
      message: `Fetching voting record… ${progress.fetched} of ${progress.total} votes`,
      bar: (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      ),
    };
  }

  return {
    message: `Fetching voting record… ${progress.fetched} votes so far`,
    bar: (
      <div className={styles.progressBar}>
        <div className={styles.progressIndeterminate} />
      </div>
    ),
  };
}

export default function VoteprintSkeleton({ progress }: VoteprintSkeletonProps = {}) {
  const { message, bar } = getLoadingContent(progress);

  return (
    <div
      className={styles.panel}
      aria-busy="true"
      aria-label="Loading voting record…"
    >
      {/* Heading bar */}
      <div className={styles.headingBar} />

      {/* Canvas + legend row */}
      <div className={styles.visualSection}>
        <div className={styles.canvasColumn}>
          {/* Circular placeholder — same 220px diameter as the real canvas */}
          <div className={styles.canvasCircle} aria-hidden="true" />

          {/* Loading message — static or live depending on progress prop */}
          <p className={styles.loadingMessage}>{message}</p>

          {/* Progress bar — only shown when progress data is available */}
          {bar}
        </div>

        {/* Legend placeholder — 6 rows */}
        <div className={styles.legendWrapper} aria-hidden="true">
          {[60, 75, 50, 80, 65, 45].map((w, i) => (
            <div key={i} className={styles.legendRow}>
              <div className={styles.legendDot} />
              <div className={styles.legendBar} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Vote list placeholder — 4 rows */}
      <div className={styles.voteList} aria-hidden="true">
        {[100, 85, 95, 70].map((w, i) => (
          <div key={i} className={styles.voteRow}>
            <div className={styles.voteBarShort} />
            <div className={styles.voteBarLong} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
