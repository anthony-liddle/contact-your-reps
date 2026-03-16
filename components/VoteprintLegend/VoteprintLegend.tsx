'use client';

/**
 * VoteprintLegend — per-category breakdown list.
 *
 * Each row shows: color dot, truncated label, alignment summary.
 * Sorted by vote count descending. An "All issues" row at the top clears the
 * active filter. Clicking a row selects/deselects the matching category.
 */

import type { Vote } from '@/lib/voteprint';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/voteprint/utils';
import styles from './VoteprintLegend.module.css';

interface VoteprintLegendProps {
  votes: Vote[];
  activeCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

interface CategoryStat {
  id: string;
  count: number;
  alignedCount: number;
  againstCount: number;
}

function buildStats(votes: Vote[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const v of votes) {
    if (!v.category) continue;
    if (!map.has(v.category)) {
      map.set(v.category, { id: v.category, count: 0, alignedCount: 0, againstCount: 0 });
    }
    const s = map.get(v.category)!;
    s.count++;
    if (v.alignedWithIssue === true) s.alignedCount++;
    if (v.alignedWithIssue === false) s.againstCount++;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function AlignmentSummary({ stat }: { stat: CategoryStat }) {
  const { alignedCount, againstCount } = stat;
  const stanceTotal = alignedCount + againstCount;

  if (stanceTotal === 0) {
    return <span className={`${styles.summaryText} ${styles.summaryNoData}`}>no data</span>;
  }

  if (alignedCount === stanceTotal) {
    return <span className={`${styles.summaryText} ${styles.summaryAligned}`}>all with issue</span>;
  }

  if (againstCount === stanceTotal) {
    return <span className={`${styles.summaryText} ${styles.summaryAgainst}`}>all against issue</span>;
  }

  return (
    <span className={`${styles.summaryText} ${styles.summaryMixed}`}>
      <span className={styles.summaryAligned}>{alignedCount}</span>
      {' with · '}
      <span className={styles.summaryAgainst}>{againstCount}</span>
      {' against'}
    </span>
  );
}

export default function VoteprintLegend({
  votes,
  activeCategory,
  onCategorySelect,
}: VoteprintLegendProps) {
  const stats = buildStats(votes);

  const handleAll = () => onCategorySelect(null);

  return (
    <div className={styles.legend} role="list" aria-label="Vote categories">
      {/* "All issues" row */}
      <button
        type="button"
        className={`${styles.row} ${activeCategory === null ? styles.active : ''}`}
        onClick={handleAll}
        aria-pressed={activeCategory === null}
      >
        <span
          className={styles.dot}
          style={{ background: 'var(--text-muted)' }}
          aria-hidden="true"
        />
        <span className={styles.label}>All issues</span>
        <span className={styles.count}>{votes.length} votes</span>
      </button>

      {/* Per-category rows */}
      {stats.map((stat) => {
        const color = CATEGORY_COLORS[stat.id] ?? '#94a3b8';
        const label = CATEGORY_LABELS[stat.id] ?? stat.id;
        const isActive = activeCategory === stat.id;

        return (
          <button
            key={stat.id}
            type="button"
            className={`${styles.row} ${isActive ? styles.active : ''}`}
            onClick={() => onCategorySelect(isActive ? null : stat.id)}
            aria-pressed={isActive}
          >
            <span
              className={styles.dot}
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className={styles.label} title={label}>
              {label}
            </span>
            <AlignmentSummary stat={stat} />
          </button>
        );
      })}
    </div>
  );
}
