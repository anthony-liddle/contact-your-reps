'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ZipCodeInput from '@/components/ZipCodeInput';
import RepresentativeCard from '@/components/RepresentativeCard';
import IssueSelector from '@/components/IssueSelector';
import MessagePreview from '@/components/MessagePreview';
import ConfirmTemplateModal from '@/components/ConfirmTemplateModal';
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
  const [pendingSelectionIds, setPendingSelectionIds] = useState<Set<string> | null>(null);
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);

  // Holds a ?category= param from the voteprint page's contact banner link.
  // Stored in a ref (not state) so it doesn't trigger a premature render —
  // the value is only applied once reps have loaded and the IssueSelector is
  // visible (see the appState effect below).
  const pendingCategoryRef = useRef<string | null>(null);

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

    // Persist the ZIP so it can be restored on the next visit within this tab
    sessionStorage.setItem('cyr_zip', zipCode);

    setRepresentatives(result.representatives);

    // Build location info string from 5calls response
    if (result.location) {
      const parts = [result.location, result.state].filter(Boolean);
      setLocationInfo(parts.join(', '));
    }

    setAppState('representatives');
  }, []);

  const handleSelectionChange = useCallback((newIds: Set<string>) => {
    if (editedBody !== null) {
      // User has edited the message — hold the selection change and ask what to do
      setPendingSelectionIds(newIds);
    } else {
      setSelectedIssueIds(newIds);
    }
  }, [editedBody]);

  const handleConfirmUpdate = useCallback(() => {
    if (pendingSelectionIds !== null) {
      setSelectedIssueIds(pendingSelectionIds);
      setPendingSelectionIds(null);
      setEditedBody(null);
    }
  }, [pendingSelectionIds]);

  const handleKeepEdits = useCallback(() => {
    setPendingSelectionIds(null);
  }, []);

  const handleReset = useCallback(() => {
    sessionStorage.removeItem('cyr_zip');
    setAppState('initial');
    setRepresentatives([]);
    setSelectedIssueIds(new Set());
    setPendingSelectionIds(null);
    setEditedBody(null);
    setError(null);
    setLocationInfo(null);
  }, []);

  // Mount effect — runs once, SSR-safe (sessionStorage only accessed inside useEffect).
  //
  // 1. Read ?category= from the URL (written by VoteList's contact banner when
  //    the user clicks "Write to <rep>"). Store the value in a ref so it can be
  //    applied after the rep lookup completes (see the appState effect below),
  //    then clean the URL so the param doesn't re-appear on reload.
  //
  // 2. Restore the last successful ZIP from sessionStorage (key: 'cyr_zip').
  //    Uses sessionStorage rather than localStorage so the data clears when the
  //    tab closes — consistent with the app's "We do not store your data" stance.
  //
  // NOTE: if ?repId= is also present we intentionally skip pre-selecting that
  // representative. Reps are loaded async via ZIP, and sessionStorage restoration
  // below handles re-loading the correct rep list automatically.
  useEffect(() => {
    // Capture and clean URL params
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category && issues.some((i) => i.id === category)) {
      pendingCategoryRef.current = category;
    }
    if (window.location.search) {
      history.replaceState(null, '', window.location.pathname);
    }

    // Auto-restore ZIP lookup — calling an async handler from a mount effect is
    // intentional here (not a synchronous setState pattern).
    const savedZip = sessionStorage.getItem('cyr_zip');
    if (savedZip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void handleZipSubmit(savedZip);
    }
  }, [handleZipSubmit]);

  // Apply the pending category pre-selection once reps have loaded and the
  // IssueSelector is rendered. Clear the ref immediately so subsequent
  // appState changes (e.g., user resets and reloads reps) don't re-apply it.
  useEffect(() => {
    if (appState === 'representatives' && pendingCategoryRef.current !== null) {
      setSelectedIssueIds(new Set([pendingCategoryRef.current]));
      pendingCategoryRef.current = null;
    }
  }, [appState]);

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
            Find your senators and representative by ZIP code and write to Congress about the issues that matter to you.
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
              We&apos;ll help you compose and send a message to your congressman about the issues you care about.
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
                onSelectionChange={handleSelectionChange}
              />
            </section>

            {/* Message Preview Section */}
            <section className={styles.section}>
              <MessagePreview
                message={generatedMessage}
                editedBody={editedBody}
                onBodyChange={setEditedBody}
              />
            </section>

            <ConfirmTemplateModal
              open={pendingSelectionIds !== null}
              onUpdate={handleConfirmUpdate}
              onKeep={handleKeepEdits}
            />
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
            <a href="/privacy">Privacy</a>
            {' · '}
            <a href="/about">About</a>
            {' · '}
            <span>MIT License</span>
          </p>
        </div>
      </footer>
    </>
  );
}
