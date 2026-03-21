/**
 * VoteprintLoader — client component for cold-cache voteprint loading.
 *
 * Opens an EventSource to /api/votes/[bioguideId]/progress and renders
 * VoteprintSkeleton with live progress updates. On "complete", calls
 * router.refresh() which causes the server to re-render VoteprintContent
 * from the now-warm cache.
 *
 * State machine:
 *   streaming  — SSE active; skeleton shows live progress
 *   completing — "complete" received; skeleton shows 100% bar; refresh in-flight
 *   error      — SSE failed; error UI with reload button
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VoteprintSkeleton from '@/components/VoteprintSkeleton/VoteprintSkeleton';
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
  const router = useRouter();
  const [state, setState] = useState<LoaderState>('streaming');
  const [progress, setProgress] = useState<ProgressData | null>(null);

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
        router.refresh();
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
  }, [bioguideId, party, congress, router]);

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
