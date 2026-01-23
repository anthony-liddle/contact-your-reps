'use client';

import styles from './TrustBadges.module.css';

// TODO: explain this, maybe in tooltips?

export default function TrustBadges() {
  return (
    <div className={styles.container} role="region" aria-label="Privacy and trust information">
      <div className={styles.badge}>
        <span className={styles.icon} aria-hidden="true">
          🔒
        </span>
        <span className={styles.text}>We do not send messages on your behalf</span>
      </div>
      <div className={styles.badge}>
        <span className={styles.icon} aria-hidden="true">
          🚫
        </span>
        <span className={styles.text}>We do not store your data</span>
      </div>
      <div className={styles.badge}>
        <span className={styles.icon} aria-hidden="true">
          ✓
        </span>
        <span className={styles.text}>100% client-side processing</span>
      </div>
    </div>
  );
}
