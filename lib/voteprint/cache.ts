/**
 * Cache layer for the Voteprint data layer.
 *
 * In production (NODE_ENV === 'production') or when FORCE_BLOB_CACHE=true,
 * data is stored in Vercel Blob so it persists across deployments and
 * serverless function invocations.
 *
 * In development, a local file cache is used at .cache/voteprint/{key}.json
 * to avoid repeated API calls during UI development.
 *
 * All operations fail silently — a cache miss is never a fatal error.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { put, list } from '@vercel/blob';

const CACHE_DIR = join(process.cwd(), '.cache', 'voteprint');

interface CacheEnvelope<T> {
  cachedAt: string;
  data: T;
}

/** Returns true when Vercel Blob should be used instead of the local fs cache. */
function blobEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.FORCE_BLOB_CACHE === 'true'
  );
}

function blobKey(key: string): string {
  return `voteprint-cache/${key}.json`;
}

function cacheFilePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

// ---------------------------------------------------------------------------
// Blob implementation
// ---------------------------------------------------------------------------

async function readBlobCache<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: blobKey(key) });
    const match = blobs.find((b) => b.pathname === blobKey(key));
    if (!match) return null;

    const res = await fetch(match.url);
    if (!res.ok) return null;

    const envelope: CacheEnvelope<T> = await res.json();
    const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
    if (ageMs > ttlMs) return null;

    return envelope.data;
  } catch {
    return null;
  }
}

async function writeBlobCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = {
      cachedAt: new Date().toISOString(),
      data,
    };
    const json = JSON.stringify(envelope, null, 2);
    await put(blobKey(key), json, {
      access: 'public',
      contentType: 'application/json',
    });
  } catch {
    // Silent failure — a failed cache write must never break the data fetch
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a cached value. Returns null if the entry is missing, unreadable,
 * or older than ttlMs milliseconds.
 *
 * @param key   - The cache key (e.g. "member-S000344-congress-119")
 * @param ttlMs - Max age in milliseconds (default: 24 hours)
 */
export async function readCache<T>(
  key: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<T | null> {

  if (blobEnabled()) {
    return readBlobCache<T>(key, ttlMs);
  }

  // fs path (development)
  try {
    const filePath = cacheFilePath(key);
    if (!existsSync(filePath)) return null;

    const raw = readFileSync(filePath, 'utf-8');
    const envelope: CacheEnvelope<T> = JSON.parse(raw);

    const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
    if (ageMs > ttlMs) return null;

    return envelope.data;
  } catch {
    return null;
  }
}

/**
 * Writes a value to the cache with a timestamp.
 * Fails silently on any error.
 *
 * @param key  - The cache key (e.g. "member-S000344-congress-119")
 * @param data - The data to cache
 */
export async function writeCache<T>(key: string, data: T): Promise<void> {

  if (blobEnabled()) {
    return writeBlobCache(key, data);
  }

  // fs path (development)
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
