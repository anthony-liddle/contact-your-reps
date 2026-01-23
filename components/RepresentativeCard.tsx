'use client';

import Image from 'next/image';
import type { Representative } from '@/lib/types';
import styles from './RepresentativeCard.module.css';

interface RepresentativeCardProps {
  representative: Representative;
}

export default function RepresentativeCard({
  representative,
}: RepresentativeCardProps) {
  const { name, phone, url, photoUrl, party, state, reason, area, fieldOffices } = representative;

  const isSenator = area === 'US Senate';
  const title = isSenator ? 'Senator' : 'Representative';
  const partyLabel = party ? ` (${party})` : '';

  return (
    <article className={styles.card} aria-labelledby={`rep-${name.replace(/\s+/g, '-')}`}>
      <div className={styles.cardHeader}>
        {photoUrl ? (
          <div className={styles.photoContainer}>
            <Image
              src={photoUrl}
              alt={`Photo of ${title} ${name}`}
              width={80}
              height={80}
              className={styles.photo}
            />
          </div>
        ) : (
          <div className={`${styles.photoContainer} ${styles.photoPlaceholder}`}>
            <span role="img" aria-label="Official placeholder">🏛️</span>
          </div>
        )}

        <div className={styles.headerInfo}>
          <h3 id={`rep-${name.replace(/\s+/g, '-')}`} className={styles.name}>
            {title} {name}
            <span className={styles.party}>{partyLabel}</span>
          </h3>
          <p className={styles.office}>{area} · {state}</p>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.contactGrid}>
          {/* DC Phone */}
          <div className={styles.contactItem}>
            <div className={styles.iconWrapper} title="DC Phone">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div className={styles.contactDetail}>
              <span className={styles.contactLabel}>DC Office</span>
              <a href={`tel:${phone}`} className={styles.contactLink}>
                {phone}
              </a>
            </div>
          </div>

          {/* Local Offices (Limit to 1 to save space, or list nicely) */}
          {fieldOffices && fieldOffices.length > 0 && (
            <div className={styles.contactItem}>
              <div className={styles.iconWrapper} title="Local Phone">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className={styles.contactDetail}>
                <span className={styles.contactLabel}>{fieldOffices[0].city} Office</span>
                <a href={`tel:${fieldOffices[0].phone}`} className={styles.contactLink}>
                  {fieldOffices[0].phone}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.primaryAction}
          >
            Contact Form
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.actionIcon}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>

        <div className={styles.footer}>
          <p className={styles.reason}>{reason}</p>
        </div>
      </div>
    </article>
  );
}
