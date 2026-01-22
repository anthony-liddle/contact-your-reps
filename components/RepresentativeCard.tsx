'use client';

import type { Representative } from '@/lib/types';
import styles from './RepresentativeCard.module.css';

interface RepresentativeCardProps {
  representative: Representative;
}

export default function RepresentativeCard({
  representative,
}: RepresentativeCardProps) {
  const { name, office, party, emails, phones, urls, contactFormUrl } = representative;

  const isSenator = office.toLowerCase().includes('senator');
  const title = isSenator ? 'Senator' : 'Representative';
  const partyLabel = party ? ` (${party})` : '';

  const hasEmail = emails && emails.length > 0;
  const hasPhone = phones && phones.length > 0;
  const hasWebsite = urls && urls.length > 0;
  const hasContactForm = !!contactFormUrl;

  return (
    <article className={styles.card} aria-labelledby={`rep-${name.replace(/\s+/g, '-')}`}>
      <header className={styles.header}>
        <h3 id={`rep-${name.replace(/\s+/g, '-')}`} className={styles.name}>
          {title} {name}
          {partyLabel && <span className={styles.party}>{partyLabel}</span>}
        </h3>
        <p className={styles.office}>{office}</p>
      </header>

      <div className={styles.contactInfo}>
        {/* Contact Form - Primary contact method */}
        {hasContactForm && (
          <div className={styles.contactItem}>
            <span className={styles.contactIcon} aria-hidden="true">
              ✉
            </span>
            <span className={styles.contactLabel}>Contact:</span>
            <a
              href={contactFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.contactLink} ${styles.contactFormLink}`}
            >
              Official Contact Form
              <span className={styles.srOnly}>(opens in new tab)</span>
            </a>
          </div>
        )}

        {/* Direct Email - if available */}
        {hasEmail && (
          <div className={styles.contactItem}>
            <span className={styles.contactIcon} aria-hidden="true">
              ✉
            </span>
            <span className={styles.contactLabel}>Email:</span>
            <a href={`mailto:${emails[0]}`} className={styles.contactLink}>
              {emails[0]}
            </a>
          </div>
        )}

        {/* Show message if no contact method available */}
        {!hasContactForm && !hasEmail && (
          <div className={styles.contactItem}>
            <span className={styles.contactIcon} aria-hidden="true">
              ✉
            </span>
            <span className={styles.noEmail}>
              Use website to find contact form
            </span>
          </div>
        )}

        {hasPhone && (
          <div className={styles.contactItem}>
            <span className={styles.contactIcon} aria-hidden="true">
              ☎
            </span>
            <span className={styles.contactLabel}>Phone:</span>
            <a href={`tel:${phones[0]}`} className={styles.contactLink}>
              {phones[0]}
            </a>
          </div>
        )}

        {hasWebsite && (
          <div className={styles.contactItem}>
            <span className={styles.contactIcon} aria-hidden="true">
              🌐
            </span>
            <span className={styles.contactLabel}>Website:</span>
            <a
              href={urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactLink}
            >
              Official Website
              <span className={styles.srOnly}>(opens in new tab)</span>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
