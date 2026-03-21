/**
 * VoteprintLoader — client component for cold-cache voteprint loading.
 *
 * Opens an EventSource to /api/votes/[bioguideId]/progress and renders
 * VoteprintSkeleton with live progress updates. On "complete", fetches the
 * Vote[] directly from /api/votes/[bioguideId] and renders VoteprintPanel
 * without needing a router.refresh() round-trip.
 *
 * State machine:
 *   streaming  — SSE active; skeleton shows live progress
 *   completing — "complete" received; fetching Vote[] from data endpoint
 *   error      — SSE or data fetch failed; error UI with reload button
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VoteprintSkeleton from '@/components/VoteprintSkeleton/VoteprintSkeleton';
import VoteprintPanel from '@/components/VoteprintPanel/VoteprintPanel';
import type { Vote } from '@/lib/voteprint';
import styles from './page.module.css';

interface VoteprintLoaderProps {
  bioguideId: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  congress: number;
}

type LoaderState = 'streaming' | 'completing' | 'error';

interface ProgressData {
  fetched: number;
  total: number | null;
}

export default function VoteprintLoader({
  bioguideId,
  party,
  congress,
}: VoteprintLoaderProps) {
  const [state, setState] = useState<LoaderState>('streaming');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [votes, setVotes] = useState<Vote[] | null>(null);

  useEffect(() => {
    const url = `/api/votes/${bioguideId}/progress?party=${encodeURIComponent(party)}&congress=${congress}`;
    const es = new EventSource(url);

    es.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        fetched?: number;
        total?: number | null;
        message?: string;
      };

      if (data.type === 'progress') {
        setProgress({ fetched: data.fetched ?? 0, total: data.total ?? null });
      } else if (data.type === 'complete') {
        es.close();
        setState('completing');

        // Fetch the processed votes directly — no router.refresh() needed.
        // The SSE route already warmed the cache, so this returns immediately.
        fetch(
          `/api/votes/${bioguideId}?party=${encodeURIComponent(party)}&congress=${congress}`,
        )
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<Vote[]>;
          })
          .then((data) => setVotes(data))
          .catch(() => setState('error'));
      } else if (data.type === 'error') {
        es.close();
        setState('error');
      }
    };

    es.onerror = () => {
      es.close();
      setState('error');
    };

    return () => {
      es.close();
    };
  }, [bioguideId, party, congress]);

  if (votes) {
    return (
      <VoteprintPanel
        votes={votes}
        repName={bioguideId}
        repBioguideId={bioguideId}
      />
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>
          Unable to load voting record. This may be a temporary issue — try
          reloading the page.
        </p>
        <div className={styles.errorActions}>
          <Link href="/" className={styles.errorBack}>
            ← Back to representatives
          </Link>
          { }
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <VoteprintSkeleton
      progress={state === 'completing' ? 'complete' : progress}
    />
  );
}
