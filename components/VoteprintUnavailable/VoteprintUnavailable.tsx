import styles from './VoteprintUnavailable.module.css';

export default function VoteprintUnavailable() {
  return (
    <div className={styles.card} role="status">
      <div className={styles.icon} aria-hidden="true">🏛️</div>
      <h2 className={styles.heading}>Senate voting records coming soon</h2>
      <p className={styles.body}>
        Senate voting records are not yet available but are coming soon. Check
        back after Senate roll call endpoints are added to the Congress.gov v3 API.
      </p>
    </div>
  );
}
