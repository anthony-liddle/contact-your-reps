// Mock the fs module before any imports — Jest hoists this call, ensuring
// cache.ts receives mock functions when it imports from 'fs'.
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock @vercel/blob so Blob tests work without a real token
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  list: jest.fn(),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { put, list } from '@vercel/blob';
import { readCache, writeCache } from '@/lib/voteprint/cache';

const mockExistsSync = existsSync as jest.Mock;
const mockReadFileSync = readFileSync as jest.Mock;
const mockWriteFileSync = writeFileSync as jest.Mock;
const mockMkdirSync = mkdirSync as jest.Mock;
const mockPut = put as jest.Mock;
const mockList = list as jest.Mock;

const ORIG_NODE_ENV = process.env.NODE_ENV;
const ORIG_FORCE_BLOB = process.env.FORCE_BLOB_CACHE;

afterEach(() => {
  jest.clearAllMocks();
  (process.env as Record<string, string>).NODE_ENV = ORIG_NODE_ENV ?? '';
  process.env.FORCE_BLOB_CACHE = ORIG_FORCE_BLOB;
});

// ---------------------------------------------------------------------------
// fs path (development — NODE_ENV !== 'production' and FORCE_BLOB_CACHE != true)
// ---------------------------------------------------------------------------

describe('readCache (fs path)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.FORCE_BLOB_CACHE = 'false';
  });

  it('returns null for a missing cache file', async () => {
    mockExistsSync.mockReturnValue(false);
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null for a stale cache entry (cachedAt > 24 hours ago)', async () => {
    mockExistsSync.mockReturnValue(true);
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ cachedAt: staleDate, data: [{ rollCall: 1 }] }),
    );
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns the cached data for a fresh entry (cachedAt within 24 hours)', async () => {
    mockExistsSync.mockReturnValue(true);
    const freshDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const data = [{ rollCall: 42, congress: 119 }];
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ cachedAt: freshDate, data }),
    );
    expect(await readCache('member-X000001-congress-119')).toEqual(data);
  });

  it('returns null when the cache file contains invalid JSON', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json {{');
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null when readFileSync throws (e.g. permission error)', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// writeCache (fs path)
// ---------------------------------------------------------------------------

describe('writeCache (fs path)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.FORCE_BLOB_CACHE = 'false';
  });

  it('creates the cache directory and writes a JSON file', async () => {
    mockMkdirSync.mockImplementation(() => {});
    mockWriteFileSync.mockImplementation(() => {});

    const data = [{ rollCall: 10 }];
    await writeCache('member-S000344-congress-119', data);

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.cache'),
      { recursive: true },
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('member-S000344-congress-119.json'),
      expect.stringContaining('"rollCall": 10'),
      'utf-8',
    );
  });

  it('writes an envelope containing cachedAt and data', async () => {
    let written = '';
    mockMkdirSync.mockImplementation(() => {});
    mockWriteFileSync.mockImplementation((_path: string, content: string) => {
      written = content;
    });

    await writeCache('test-key', { value: 'hello' });

    const envelope = JSON.parse(written);
    expect(envelope).toHaveProperty('cachedAt');
    expect(envelope).toHaveProperty('data', { value: 'hello' });
    expect(new Date(envelope.cachedAt).getTime()).toBeCloseTo(Date.now(), -3);
  });

  it('fails silently when mkdirSync throws', async () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EROFS: read-only file system');
    });
    await expect(writeCache('test-key', { x: 1 })).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// round-trip: writeCache → readCache (fs path)
// ---------------------------------------------------------------------------

describe('writeCache then readCache (fs path)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.FORCE_BLOB_CACHE = 'false';
  });

  it('writeCache writes a file that readCache can subsequently read', async () => {
    const fileSystem: Record<string, string> = {};

    mockMkdirSync.mockImplementation(() => {});
    mockWriteFileSync.mockImplementation((filePath: string, content: string) => {
      fileSystem[filePath as string] = content;
    });
    mockExistsSync.mockImplementation(
      (filePath: string) => filePath in fileSystem,
    );
    mockReadFileSync.mockImplementation((filePath: string) => {
      const content = fileSystem[filePath as string];
      if (content === undefined) throw new Error('ENOENT');
      return content;
    });

    const original = [{ rollCall: 55, congress: 119, chamber: 'House' }];
    await writeCache('round-trip-key', original);
    const result = await readCache<typeof original>('round-trip-key');

    expect(result).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// Blob path (FORCE_BLOB_CACHE=true)
// ---------------------------------------------------------------------------

describe('readCache (Blob path)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.FORCE_BLOB_CACHE = 'true';
  });

  it('returns null when the blob does not exist', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null when the blob exists but fetch fails', async () => {
    mockList.mockResolvedValue({
      blobs: [{ pathname: 'voteprint-cache/member-X000001-congress-119.json', url: 'https://example.com/blob' }],
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;

    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null when the cached blob is stale', async () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const envelope = { cachedAt: staleDate, data: [{ rollCall: 1 }] };

    mockList.mockResolvedValue({
      blobs: [{ pathname: 'voteprint-cache/member-X000001-congress-119.json', url: 'https://example.com/blob' }],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    }) as jest.Mock;

    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns data when blob is fresh', async () => {
    const freshDate = new Date(Date.now() - 60 * 1000).toISOString();
    const data = [{ rollCall: 42, congress: 119 }];
    const envelope = { cachedAt: freshDate, data };

    mockList.mockResolvedValue({
      blobs: [{ pathname: 'voteprint-cache/member-X000001-congress-119.json', url: 'https://example.com/blob' }],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    }) as jest.Mock;

    expect(await readCache('member-X000001-congress-119')).toEqual(data);
  });

  it('returns null when list() throws', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    expect(await readCache('member-X000001-congress-119')).toBeNull();
  });
});

describe('writeCache (Blob path)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.FORCE_BLOB_CACHE = 'true';
  });

  it('calls put with the correct key, JSON, and options', async () => {
    mockPut.mockResolvedValue({ url: 'https://example.com/blob' });

    const data = [{ rollCall: 10 }];
    await writeCache('member-S000344-congress-119', data);

    expect(mockPut).toHaveBeenCalledWith(
      'voteprint-cache/member-S000344-congress-119.json',
      expect.stringContaining('"rollCall": 10'),
      { access: 'public', contentType: 'application/json' },
    );
  });

  it('put payload contains a cachedAt envelope', async () => {
    let writtenJson = '';
    mockPut.mockImplementation((_key: string, json: string) => {
      writtenJson = json;
      return Promise.resolve({ url: 'https://example.com/blob' });
    });

    await writeCache('test-key', { value: 'hello' });

    const envelope = JSON.parse(writtenJson);
    expect(envelope).toHaveProperty('cachedAt');
    expect(envelope).toHaveProperty('data', { value: 'hello' });
  });

  it('fails silently when put() throws', async () => {
    mockPut.mockRejectedValue(new Error('Blob upload failed'));
    await expect(writeCache('test-key', { x: 1 })).resolves.toBeUndefined();
  });
});
