/**
 * File-based cache for the Voteprint data layer.
 * Used in development to avoid repeated API calls during UI development.
 * In production, fetchMemberVotes relies on Next.js's built-in fetch cache instead.
 *
 * Cache files live at .cache/voteprint/{key}.json relative to the project root.
 * All operations fail silently — a cache miss is never a fatal error.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = join(process.cwd(), '.cache', 'voteprint');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEnvelope<T> {
  cachedAt: string;
  data: T;
}

function cacheFilePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Reads a cached value from disk. Returns null if the entry is missing,
 * unreadable, or older than 24 hours.
 *
 * @param key - The cache key (e.g. "member-S000344-congress-119")
 */
export function readCache<T>(key: string): T | null {
  try {
    const filePath = cacheFilePath(key);
    if (!existsSync(filePath)) return null;

    const raw = readFileSync(filePath, 'utf-8');
    const envelope: CacheEnvelope<T> = JSON.parse(raw);

    const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
    if (ageMs > CACHE_TTL_MS) return null;

    return envelope.data;
  } catch {
    return null;
  }
}

/**
 * Writes a value to the disk cache with a timestamp.
 * Creates the cache directory if it doesn't exist.
 * Fails silently on any error.
 *
 * @param key  - The cache key (e.g. "member-S000344-congress-119")
 * @param data - The data to cache
 */
export function writeCache<T>(key: string, data: T): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const envelope: CacheEnvelope<T> = {
      cachedAt: new Date().toISOString(),
      data,
    };
    writeFileSync(cacheFilePath(key), JSON.stringify(envelope, null, 2), 'utf-8');
  } catch {
    // Silent failure — a failed cache write must never break the data fetch
  }
}
