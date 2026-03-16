'use client';

/**
 * VoteprintPanel — client-side state wrapper for the Voteprint feature.
 *
 * activeCategory state lives here because it is the lowest common ancestor of
 * the three components that read it: Voteprint (canvas), VoteprintLegend, and
 * VoteList. Keeping state here avoids prop-drilling through the server page
 * and lets all three children stay in sync from a single source of truth.
 */

import { useState, useMemo, useEffect } from 'react';
import type { Vote } from '@/lib/voteprint';
import { CATEGORY_LABELS } from '@/lib/voteprint/utils';
import Voteprint from '@/components/Voteprint/Voteprint';
import VoteprintLegend from '@/components/VoteprintLegend/VoteprintLegend';
import VoteList from '@/components/VoteList/VoteList';
import styles from './VoteprintPanel.module.css';

interface VoteprintPanelProps {
  votes: Vote[];
  repName: string;
  repBioguideId: string;
}

export default function VoteprintPanel({
  votes,
  repName,
  repBioguideId,
}: VoteprintPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(repName);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cyr_viewing_rep');
      if (raw) {
        const stored = JSON.parse(raw) as { id?: string; name?: string };
        if (stored.id === repBioguideId && stored.name) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDisplayName(stored.name);
        }
      }
    } catch {
      // sessionStorage unavailable or invalid JSON — use prop value
    }
  }, [repBioguideId]);

  // Stats used in the screen-reader summary
  const { yeaCount, total, mappedCount, catCount } = useMemo(() => {
    const mapped = votes.filter((v) => v.category !== null);
    const cats = new Set(mapped.map((v) => v.category));
    return {
      yeaCount: votes.filter((v) => v.position === 'yea').length,
      total: votes.length,
      mappedCount: mapped.length,
      catCount: cats.size,
    };
  }, [votes]);

  const yeaPct = total > 0 ? Math.round((yeaCount / total) * 100) : 0;

  const activeCategoryLabel = activeCategory
    ? (CATEGORY_LABELS[activeCategory] ?? activeCategory)
    : null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>{displayName}&apos;s Voteprint</h2>

      <div className={styles.visualSection}>
        {/* Canvas column — fixed width to prevent layout shift */}
        <div className={styles.canvasColumn}>
          {/* Visually hidden summary for screen readers */}
          <p className="sr-only">
            {displayName} voted yea on {yeaCount} of {total} recorded votes ({yeaPct}%).{' '}
            {mappedCount} votes are categorized across {catCount} issue{catCount !== 1 ? 's' : ''}.
            {activeCategoryLabel
              ? ` Currently filtered to: ${activeCategoryLabel}.`
              : ''}
          </p>

          <Voteprint
            votes={votes}
            activeCategory={activeCategory}
            onCategorySelect={setActiveCategory}
            repName={displayName}
            size={220}
          />

          {/* Chart explainer caption */}
          <p className={styles.caption} aria-hidden="true">
            Long lines = aligned with issue · short = opposed · gaps = absent.
            Click a wedge or category to filter.
          </p>
        </div>

        <div className={styles.legendWrapper}>
          <VoteprintLegend
            votes={votes}
            activeCategory={activeCategory}
            onCategorySelect={setActiveCategory}
          />
        </div>
      </div>

      <VoteList
        votes={votes}
        activeCategory={activeCategory}
        repName={displayName}
        repBioguideId={repBioguideId}
      />
    </div>
  );
}
