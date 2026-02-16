import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About | Contact Your Representatives',
  description:
    'Learn how Contact Your Representatives helps you find your representative by ZIP code and write to your senator or congressman. Free, open-source, and privacy-focused.',
};

export default function AboutPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>About</h1>
          <p className={styles.subtitle}>
            A free, privacy-focused tool that makes it easy to contact your federal representatives.
          </p>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <article className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Find Your Representative by ZIP Code</h2>
            <p>
              Contact Your Representatives makes civic engagement simple. Enter your ZIP code and
              instantly find your two U.S. Senators and your House Representative, complete with
              their contact information and official contact forms.
            </p>
            <p>
              We use the{' '}
              <a href="https://5calls.org" target="_blank" rel="noopener noreferrer">
                5calls.org
              </a>{' '}
              API to provide accurate, up-to-date representative data so you always reach the right
              office.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Write to Your Senator or Congressman</h2>
            <p>
              Once you&apos;ve found your representatives, select the issues you care about and
              we&apos;ll help you compose a personalized message. Copy the message to your clipboard
              and paste it directly into your representative&apos;s official contact form.
            </p>
            <ul className={styles.list}>
              <li>Choose from a range of current policy issues</li>
              <li>Get a personalized, editable message draft</li>
              <li>Contact your senators and representative directly through their official forms</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Privacy First</h2>
            <p>
              Your privacy is our top priority. We don&apos;t store your ZIP code, track your
              activity, or save any personal information. Everything happens in your browser, and
              nothing is sent to our servers. Read our full{' '}
              <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Open Source</h2>
            <p>
              This project is completely open source under the MIT License. You can review the code,
              suggest improvements, or contribute on{' '}
              <a
                href="https://github.com/anthony-liddle/contact-your-reps"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              . Transparency is a core value — you can verify exactly how your data is handled.
            </p>
          </section>

          <div className={styles.backLink}>
            <Link href="/">&larr; Back to Contact Your Representatives</Link>
          </div>
        </article>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.disclaimer}>
            This is an independent, open-source project and is not affiliated with, endorsed by, or
            connected to the U.S. government or any government agency.
          </p>
          <p className={styles.footerLinks}>
            <a
              href="https://github.com/anthony-liddle/contact-your-reps"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
            {' · '}
            <Link href="/privacy">Privacy</Link>
            {' · '}
            <span>MIT License</span>
          </p>
        </div>
      </footer>
    </>
  );
}
