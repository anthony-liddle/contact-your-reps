'use client';

import { useState, useMemo, useCallback } from 'react';
import ZipCodeInput from '@/components/ZipCodeInput';
import RepresentativeCard from '@/components/RepresentativeCard';
import IssueSelector from '@/components/IssueSelector';
import MessagePreview from '@/components/MessagePreview';
import TrustBadges from '@/components/TrustBadges';
import { getRepresentativesByZip } from '@/lib/civic-api';
import { generateMessage } from '@/lib/message-generator';
import { issues } from '@/data/issues';
import type { Representative } from '@/lib/types';
import styles from './page.module.css';

type AppState = 'initial' | 'loading' | 'representatives' | 'error';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('initial');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);

  const handleZipSubmit = useCallback(async (zipCode: string) => {
    setAppState('loading');
    setError(null);

    const result = await getRepresentativesByZip(zipCode);

    if (result.error) {
      setError(result.error);
      setAppState('error');
      return;
    }

    if (result.representatives.length === 0) {
      setError('No federal representatives found for this ZIP code.');
      setAppState('error');
      return;
    }

    setRepresentatives(result.representatives);

    // Build location info string from 5calls response
    if (result.location) {
      const parts = [result.location, result.state].filter(Boolean);
      setLocationInfo(parts.join(', '));
    }

    setAppState('representatives');
  }, []);

  const handleReset = useCallback(() => {
    setAppState('initial');
    setRepresentatives([]);
    setSelectedIssueIds(new Set());
    setError(null);
    setLocationInfo(null);
  }, []);

  const selectedIssues = useMemo(() => {
    return issues.filter((issue) => selectedIssueIds.has(issue.id));
  }, [selectedIssueIds]);

  const generatedMessage = useMemo(() => {
    return generateMessage(selectedIssues, representatives);
  }, [selectedIssues, representatives]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Contact Your Representatives</h1>
          <p className={styles.subtitle}>
            Make your voice heard. Contact your federal representatives about the issues that matter to you.
          </p>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {/* Landing / Initial State */}
        {(appState === 'initial' || appState === 'loading' || appState === 'error') && (
          <section className={styles.section} aria-labelledby="get-started-heading">
            <h2 id="get-started-heading" className={styles.sectionHeading}>
              Get Started
            </h2>
            <p className={styles.sectionDescription}>
              Enter your ZIP code to find your U.S. Senators and House Representative.
              We&apos;ll help you compose a message about the issues you care about.
            </p>

            <TrustBadges />

            <div className={styles.zipInputWrapper}>
              <ZipCodeInput
                onSubmit={handleZipSubmit}
                isLoading={appState === 'loading'}
                error={appState === 'error' ? error ?? undefined : undefined}
              />
            </div>
          </section>
        )}

        {/* Representatives Found */}
        {appState === 'representatives' && (
          <>
            {/* Representatives Section */}
            <section className={styles.section} aria-labelledby="representatives-heading">
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="representatives-heading" className={styles.sectionHeading}>
                    Your Federal Representatives
                  </h2>
                  {locationInfo && (
                    <p className={styles.locationInfo}>
                      Showing representatives for: <strong>{locationInfo}</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.changeButton}
                >
                  Change ZIP Code
                </button>
              </div>

              <div className={styles.representativesGrid}>
                {representatives.map((rep) => (
                  <RepresentativeCard key={rep.id} representative={rep} />
                ))}
              </div>
            </section>

            {/* Issue Selection Section */}
            <section className={styles.section} aria-labelledby="issues-heading">
              <h2 id="issues-heading" className="sr-only">
                Select Issues
              </h2>
              <IssueSelector
                issues={issues}
                selectedIds={selectedIssueIds}
                onSelectionChange={setSelectedIssueIds}
              />
            </section>

            {/* Message Preview Section */}
            <section className={styles.section}>
              <MessagePreview message={generatedMessage} />
            </section>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.disclaimer}>
            This is an independent, open-source project and is not affiliated with,
            endorsed by, or connected to the U.S. government or any government agency.
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
            <a href="/privacy">Privacy</a>
            {' · '}
            <span>MIT License</span>
          </p>
        </div>
      </footer>
    </>
  );
}
