/**
 * Displays a representative's identity: initials avatar, name, state/district/party
 * meta, party badge, and chamber badge. Server component — no interactivity needed.
 */

import styles from './RepHeader.module.css';

interface Rep {
  name: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  chamber: 'House' | 'Senate';
  state: string;
  district?: number;
  bioguideId: string;
}

interface RepHeaderProps {
  rep: Rep;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export default function RepHeader({ rep }: RepHeaderProps) {
  const { name, party, chamber, state, district } = rep;

  const locationMeta =
    chamber === 'House' && district
      ? `${state}-${district}`
      : state;

  const partyMod =
    party === 'Democrat'
      ? styles.partyDem
      : party === 'Republican'
        ? styles.partyRep
        : styles.partyInd;

  return (
    <header className={styles.header}>
      <div className={`${styles.avatar} ${partyMod}`} aria-hidden="true">
        {initials(name)}
      </div>

      <div className={styles.info}>
        <h1 className={styles.name}>{name}</h1>

        <p className={styles.meta}>
          <span className={styles.location}>{locationMeta}</span>
          <span className={styles.dot} aria-hidden="true">·</span>
          <span className={styles.partyLabel}>{party}</span>
        </p>

        <div className={styles.badges}>
          <span className={`${styles.badge} ${partyMod}`}>{party}</span>
          <span className={styles.badge}>{chamber}</span>
        </div>
      </div>
    </header>
  );
}
