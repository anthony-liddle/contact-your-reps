import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <p className={styles.disclaimer}>
          This is an independent, open-source project and is not affiliated with,
          endorsed by, or connected to the U.S. government or any government agency.
        </p>
        <p className={styles.footerLinks}>
          <a href="/privacy">Privacy</a>
          {' · '}
          <Link href="/about">About</Link>
          {' · '}
          <span>MIT License</span>
        </p>
      </div>
    </footer>
  );
}
