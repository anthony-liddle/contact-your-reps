/**
 * VoteprintSkeleton — shown as the Suspense fallback while vote data loads.
 *
 * Mirrors the visual structure of VoteprintPanel so the page layout is stable
 * during the fetch. The loading message below the canvas sets honest expectations:
 * a first-time fetch can take up to 30 s; subsequent visits hit the local cache.
 */

import styles from './VoteprintSkeleton.module.css';

export default function VoteprintSkeleton() {
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

          {/* Expectation-setting message */}
          <p className={styles.loadingMessage}>
            Fetching voting record from Congress.gov — this may take up to 60
            seconds for a first-time load. Subsequent visits will be instant.
          </p>
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
