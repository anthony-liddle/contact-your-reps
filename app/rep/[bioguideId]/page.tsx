/**
 * Dynamic route: /rep/[bioguideId]
 *
 * Server component — fetches the member's voting record before rendering.
 * Rep display data (name, photoUrl, phone, url, state) is stored in
 * sessionStorage under 'cyr_viewing_rep' by RepresentativeCard on navigate,
 * and read by RepHeader on the client. Only party and chamber are read from
 * URL search params (still needed for server-side data fetching and routing).
 *
 * If the vote fetch takes longer than VOTE_FETCH_TIMEOUT_MS, a timeout error
 * state is shown and a background cache-warming fetch is fired so the next
 * visit hits the cache.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getMemberVotes } from '@/lib/voteprint';
import type { Vote } from '@/lib/voteprint';
import RepHeader from '@/components/RepHeader/RepHeader';
import Footer from '@/components/Footer/Footer';
import VoteprintPanel from '@/components/VoteprintPanel/VoteprintPanel';
import VoteprintUnavailable from '@/components/VoteprintUnavailable/VoteprintUnavailable';
import VoteprintSkeleton from '@/components/VoteprintSkeleton/VoteprintSkeleton';
import ReloadButton from './ReloadButton';
import styles from './page.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOTE_FETCH_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Party normalisation
// ---------------------------------------------------------------------------

function normalizeParty(
  p: string | undefined,
): 'Democrat' | 'Republican' | 'Independent' {
  if (p === 'Democrat' || p === 'Republican') return p;
  return 'Independent';
}

interface PageProps {
  params: Promise<{ bioguideId: string }>;
  searchParams: Promise<{
    party?: string;
    chamber?: string;
  }>;
}

export default async function RepPage({ params, searchParams }: PageProps) {
  const { bioguideId } = await params;
  const sp = await searchParams;

  const party = normalizeParty(sp.party);
  const chamber: 'House' | 'Senate' = sp.chamber === 'Senate' ? 'Senate' : 'House';

  const rep = { bioguideId, party, chamber };

  return (
    <>
      {/* Sub-page navigation — same blue as the main site header */}
      <nav className={styles.subpageNav} aria-label="Site navigation">
        {/* Inner wrapper mirrors the page max-width so content aligns with
            the cards below, while the blue background still spans full width */}
        <div className={styles.subpageNavInner}>
          <Link href="/" className={styles.backLink}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.backIcon}
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to representatives
          </Link>
          <span className={styles.siteName}>
            Contact Your Representatives
          </span>
        </div>
      </nav>

      <main className={styles.page}>
        <RepHeader bioguideId={bioguideId} party={party} chamber={chamber} />

        <div className={styles.content}>
          {rep.chamber === 'House' ? (
            <Suspense fallback={<VoteprintSkeleton />}>
              <VoteprintContent
                bioguideId={rep.bioguideId}
                party={rep.party}
                repName={rep.bioguideId}
                repBioguideId={rep.bioguideId}
              />
            </Suspense>
          ) : (
            <VoteprintUnavailable />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

// Inner async component so Suspense can stream in the data independently
async function VoteprintContent({
  bioguideId,
  party,
  repName,
  repBioguideId,
}: {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  repName: string;
  repBioguideId: string;
}) {
  let votes: Vote[];
  try {
    votes = await Promise.race([
      getMemberVotes(bioguideId, party),
      new Promise<Vote[]>((_, reject) =>
        setTimeout(
          () => reject(new Error('TIMEOUT')),
          VOTE_FETCH_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      // Best-effort background warm: the next page load will hit the cache
      getMemberVotes(bioguideId, party).catch(() => { });
      return <VoteprintTimeout />;
    }
    return <VoteprintError />;
  }
  return (
    <VoteprintPanel votes={votes} repName={repName} repBioguideId={repBioguideId} />
  );
}

function VoteprintTimeout() {
  return (
    <div className={styles.errorState}>
      <p className={styles.errorMessage}>
        Loading this representative&apos;s voting record is taking longer than
        expected. This usually resolves on the next visit once data is cached.
        Try refreshing the page.
      </p>
      <div className={styles.errorActions}>
        <Link href="/" className={styles.errorBack}>
          ← Back to representatives
        </Link>
        <ReloadButton className={styles.retryButton}>Try again</ReloadButton>
      </div>
    </div>
  );
}

function VoteprintError() {
  return (
    <div className={styles.errorState}>
      <p className={styles.errorMessage}>
        Unable to load voting record. The member ID may be invalid or the data
        source is temporarily unavailable.
      </p>
      <Link href="/" className={styles.errorBack}>
        ← Back to representatives
      </Link>
    </div>
  );
}
