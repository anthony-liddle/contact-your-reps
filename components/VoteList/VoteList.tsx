'use client';

/**
 * VoteList — filterable list of individual vote records.
 *
 * Supports filtering by: all / yea / nay / absent / party-breaks.
 * When activeCategory is non-null, only shows votes in that category.
 * Clicking a vote row opens the House Clerk vote record page.
 */

import { useState, useMemo } from 'react';
import type { Vote } from '@/lib/voteprint';
import type { VoteContextEntry } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/voteprint/utils';
import styles from './VoteList.module.css';

type FilterKey = 'all' | 'yea' | 'nay' | 'absent' | 'party-breaks';

interface VoteListProps {
  votes: Vote[];
  activeCategory: string | null;
  repName: string;
  repBioguideId: string;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'yea', label: 'Yea' },
  { key: 'nay', label: 'Nay' },
  { key: 'absent', label: 'Absent' },
  { key: 'party-breaks', label: 'Party breaks' },
];

/**
 * Returns up to 3 recent votes in the active category where stance is known.
 * Used to populate 'cyr_vote_context' sessionStorage before navigating to /.
 */
function getContextVotes(votes: Vote[], activeCategory: string): VoteContextEntry[] {
  return votes
    .filter((v) => v.category === activeCategory && v.alignedWithIssue !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((v) => ({
      billNumber: v.bill?.number ?? '',
      billTitle: v.bill?.title ?? '',
      question: v.question,
      date: v.date,
      position: v.position,
      alignedWithIssue: v.alignedWithIssue,
      note: v.note,
    }));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** House Clerk roll call vote page URL. */
function clerkVoteUrl(vote: Vote): string {
  // 119th Congress session 1 → 2025, session 2 → 2026, etc.
  const year = 2025 + (vote.congress - 119) * 2 + (vote.session - 1);
  return `https://clerk.house.gov/cgi-bin/vote.asp?year=${year}&rollnumber=${vote.rollCall}`;
}

function positionLabel(position: Vote['position']): string {
  if (position === 'yea') return 'Voted yea';
  if (position === 'nay') return 'Voted nay';
  return 'Not voting / absent';
}

export default function VoteList({
  votes,
  activeCategory,
  repName,
  repBioguideId,
}: VoteListProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  // First apply category filter, then position/party filter
  const displayed = useMemo(() => {
    let list = activeCategory
      ? votes.filter((v) => v.category === activeCategory)
      : votes;

    switch (filter) {
      case 'yea':
        list = list.filter((v) => v.position === 'yea');
        break;
      case 'nay':
        list = list.filter((v) => v.position === 'nay');
        break;
      case 'absent':
        list = list.filter((v) => v.position === 'absent');
        break;
      case 'party-breaks':
        list = list.filter((v) => v.isPartyBreak);
        break;
    }

    return list;
  }, [votes, activeCategory, filter]);

  // Summary counts (on category-filtered list, before position filter)
  const base = activeCategory
    ? votes.filter((v) => v.category === activeCategory)
    : votes;

  const yeaCount = base.filter((v) => v.position === 'yea').length;
  const nayCount = base.filter((v) => v.position === 'nay').length;
  const absentCount = base.filter((v) => v.position === 'absent').length;
  const total = base.length;

  const alignedCount = base.filter((v) => v.alignedWithIssue === true).length;
  const againstCount = base.filter((v) => v.alignedWithIssue === false).length;
  const stanceTotal = alignedCount + againstCount;

  // Build contact URL with context
  const contactParams = new URLSearchParams({ repId: repBioguideId });
  if (activeCategory) {
    contactParams.set('category', activeCategory);
    contactParams.set(
      'recentVotes',
      displayed
        .slice(0, 3)
        .map((v) => v.bill?.number ?? v.question.slice(0, 40))
        .join('; '),
    );
  }
  const contactUrl = `/?${contactParams.toString()}`;

  const categoryLabel = activeCategory
    ? (CATEGORY_LABELS[activeCategory] ?? activeCategory)
    : null;

  return (
    <section className={styles.section} aria-label="Vote list">
      {/* Summary bar */}
      <div className={styles.summary}>
        <div className={styles.pills}>
          <span
            className={`${styles.pill} ${styles.pillYea}`}
            aria-label={`${yeaCount} yea votes`}
          >
            {yeaCount} yea
          </span>
          <span
            className={`${styles.pill} ${styles.pillNay}`}
            aria-label={`${nayCount} nay votes`}
          >
            {nayCount} nay
          </span>
          <span
            className={`${styles.pill} ${styles.pillAbsent}`}
            aria-label={`${absentCount} absent votes`}
          >
            {absentCount} absent
          </span>
        </div>
        {total > 0 && (
          <div
            className={styles.progressBar}
            role="img"
            aria-label={`Vote breakdown: ${Math.round((yeaCount / total) * 100)}% yea, ${Math.round((nayCount / total) * 100)}% nay`}
          >
            <div
              className={styles.progressYea}
              style={{ width: `${(yeaCount / total) * 100}%` }}
            />
            <div
              className={styles.progressNay}
              style={{ width: `${(nayCount / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className={styles.filters} role="tablist" aria-label="Filter votes">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contact banner — only shown when a category is active */}
      {activeCategory && (
        <div className={styles.contactBanner}>
          <p className={styles.contactText}>
            {stanceTotal === 0
              ? `Concerned about ${repName}'s votes on ${categoryLabel}?`
              : againstCount === stanceTotal
                ? `${repName} has voted against ${categoryLabel} ${stanceTotal} out of ${stanceTotal} ${stanceTotal === 1 ? 'time' : 'times'}`
                : alignedCount === stanceTotal
                  ? `${repName} has consistently supported ${categoryLabel}`
                  : `${repName} has voted with ${categoryLabel} ${alignedCount} ${alignedCount === 1 ? 'time' : 'times'} and against it ${againstCount} ${againstCount === 1 ? 'time' : 'times'}`}
          </p>
          <a
            href={contactUrl}
            className={styles.contactLink}
            onClick={() => {
              sessionStorage.setItem(
                'cyr_vote_context',
                JSON.stringify({
                  category: activeCategory,
                  repId: repBioguideId,
                  repName,
                  votes: getContextVotes(votes, activeCategory),
                }),
              );
            }}
          >
            Write to {repName}
          </a>
        </div>
      )}

      {/* Vote rows */}
      <ul className={styles.list} role="list" aria-label="Votes">
        {displayed.length === 0 && (
          <li className={styles.empty} role="listitem">
            No votes match this filter.
          </li>
        )}
        {displayed.map((vote) => {
          const positionClass =
            vote.position === 'yea'
              ? styles.posYea
              : vote.position === 'nay'
                ? styles.posNay
                : styles.posAbsent;

          const url = vote.bill?.url || clerkVoteUrl(vote);

          return (
            <li
              key={`${vote.congress}-${vote.session}-${vote.rollCall}`}
              role="listitem"
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.voteRow}
              >
                {/* Position indicator — role="img" so aria-label is announced */}
                <span
                  role="img"
                  className={`${styles.posCircle} ${positionClass}`}
                  aria-label={positionLabel(vote.position)}
                />

                {/* Main content */}
                <span className={styles.voteMain}>
                  <span className={styles.voteTitle}>
                    {vote.bill?.number && (
                      <span className={styles.billNumber}>
                        {vote.bill.number}
                      </span>
                    )}
                    <span className={styles.question}>{vote.question}</span>
                  </span>
                  <span className={styles.voteMeta}>
                    <span className={styles.date}>{formatDate(vote.date)}</span>
                    <span
                      className={`${styles.tag} ${vote.result === 'passed' ? styles.tagPassed : styles.tagFailed}`}
                    >
                      {vote.result === 'passed' ? 'Passed' : 'Failed'}
                    </span>
                    {vote.isPartyBreak && (
                      <span className={`${styles.tag} ${styles.tagPartyBreak}`}>
                        ≠ Party break
                      </span>
                    )}
                    {vote.alignedWithIssue === true && (
                      <span className={`${styles.tag} ${styles.tagAligned}`}>↑ With issue</span>
                    )}
                    {vote.alignedWithIssue === false && (
                      <span className={`${styles.tag} ${styles.tagOpposed}`}>↓ Against issue</span>
                    )}
                    {activeCategory === null && vote.category && (
                      <span
                        className={styles.categoryBadge}
                        style={
                          {
                            '--cat-color':
                              CATEGORY_COLORS[vote.category] ?? '#94a3b8',
                          } as React.CSSProperties
                        }
                      >
                        {CATEGORY_LABELS[vote.category] ?? vote.category}
                      </span>
                    )}
                  </span>
                  {vote.note && (
                    <span className={styles.note}>{vote.note}</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
