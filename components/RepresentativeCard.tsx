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
      <div className={styles.cardContent}>
        {photoUrl && (
          <div className={styles.photoContainer}>
            <Image
              src={photoUrl}
              alt={`Photo of ${title} ${name}`}
              width={80}
              height={80}
              className={styles.photo}
            />
          </div>
        )}

        <div className={styles.info}>
          <header className={styles.header}>
            <h3 id={`rep-${name.replace(/\s+/g, '-')}`} className={styles.name}>
              {title} {name}
              <span className={styles.party}>{partyLabel}</span>
            </h3>
            <p className={styles.office}>{area} · {state}</p>
            <p className={styles.reason}>{reason}</p>
          </header>

          <div className={styles.contactInfo}>
            {/* DC Phone */}
            <div className={styles.contactItem}>
              <span className={styles.contactIcon} aria-hidden="true">☎</span>
              <span className={styles.contactLabel}>DC:</span>
              <a href={`tel:${phone}`} className={styles.contactLink}>
                {phone}
              </a>
            </div>

            {/* Local Offices */}
            {fieldOffices && fieldOffices.map((office, index) => (
              <div key={index} className={styles.contactItem}>
                <span className={styles.contactIcon} aria-hidden="true">📍</span>
                <span className={styles.contactLabel}>{office.city}:</span>
                <a href={`tel:${office.phone}`} className={styles.contactLink}>
                  {office.phone}
                </a>
              </div>
            ))}

            {/* Website */}
            <div className={styles.contactItem}>
              <span className={styles.contactIcon} aria-hidden="true">🌐</span>
              <span className={styles.contactLabel}>Website:</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.contactLink} ${styles.contactFormLink}`}
              >
                Contact Form
                <span className={styles.srOnly}>(opens in new tab)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
