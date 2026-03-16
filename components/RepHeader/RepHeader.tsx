'use client';

/**
 * Displays a representative's identity.
 *
 * SSR / fallback state: shows "?" avatar and "Representative" name, with
 * party + chamber badges from props. On mount, reads sessionStorage
 * ('cyr_viewing_rep') and updates to full data: name, initials/photo,
 * state, phone, and website link.
 *
 * Props come from the URL (party, chamber, bioguideId) which are stable
 * across SSR and hydration. Display data comes from sessionStorage to
 * keep URLs clean.
 */

import { useState, useEffect } from 'react';
import type { Representative } from '@/lib/types';
import styles from './RepHeader.module.css';

interface RepHeaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  chamber: 'House' | 'Senate';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export default function RepHeader({ party, chamber }: RepHeaderProps) {
  const [rep, setRep] = useState<Representative | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cyr_viewing_rep');
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRep(JSON.parse(raw) as Representative);
      }
    } catch {
      // sessionStorage unavailable or invalid JSON — stay in fallback state
    }
  }, []);

  const partyMod =
    party === 'Democrat'
      ? styles.partyDem
      : party === 'Republican'
        ? styles.partyRep
        : styles.partyInd;

  const displayName = rep?.name ?? 'Representative';

  return (
    <header className={styles.header}>
      {/* Avatar — photo if available, initials otherwise */}
      <div className={styles.avatarWrapper}>
        {rep && showPhoto && rep.photoUrl ? (
          <img
            src={rep.photoUrl}
            width={64}
            height={64}
            alt={`${rep.name}, ${party} representative from ${rep.state}`}
            className={styles.photo}
            onError={() => setShowPhoto(false)}
          />
        ) : (
          <div className={`${styles.avatar} ${rep ? partyMod : ''}`} aria-hidden="true">
            {rep ? initials(rep.name) : '?'}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h1 className={styles.name}>{displayName}</h1>

        {rep ? (
          <p className={styles.meta}>
            <span className={styles.location}>{rep.state}</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span className={styles.partyLabel}>{party}</span>
          </p>
        ) : (
          <p className={styles.meta}>
            <span className={styles.partyLabel}>{party}</span>
          </p>
        )}

        <div className={styles.badges}>
          <span className={`${styles.badge} ${partyMod}`}>{party}</span>
          <span className={styles.badge}>{chamber}</span>
        </div>

        {rep && rep.phone && (
          <a href={`tel:${rep.phone}`} className={styles.phoneLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            {rep.phone}
          </a>
        )}

        {rep && rep.url && (
          <a
            href={rep.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.websiteLink}
          >
            Contact via website ↗
          </a>
        )}

        {!rep && (
          <p className={styles.fallbackNotice}>
            Visit from the main page for full representative details
          </p>
        )}
      </div>
    </header>
  );
}
