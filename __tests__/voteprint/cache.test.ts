// Mock the fs module before any imports — Jest hoists this call, ensuring
// cache.ts receives mock functions when it imports from 'fs'.
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { readCache, writeCache } from '@/lib/voteprint/cache';

const mockExistsSync = existsSync as jest.Mock;
const mockReadFileSync = readFileSync as jest.Mock;
const mockWriteFileSync = writeFileSync as jest.Mock;
const mockMkdirSync = mkdirSync as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readCache
// ---------------------------------------------------------------------------

describe('readCache', () => {
  it('returns null for a missing cache file', () => {
    mockExistsSync.mockReturnValue(false);
    expect(readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null for a stale cache entry (cachedAt > 24 hours ago)', () => {
    mockExistsSync.mockReturnValue(true);
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ cachedAt: staleDate, data: [{ rollCall: 1 }] }),
    );
    expect(readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns the cached data for a fresh entry (cachedAt within 24 hours)', () => {
    mockExistsSync.mockReturnValue(true);
    const freshDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const data = [{ rollCall: 42, congress: 119 }];
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ cachedAt: freshDate, data }),
    );
    expect(readCache('member-X000001-congress-119')).toEqual(data);
  });

  it('returns null when the cache file contains invalid JSON', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json {{');
    expect(readCache('member-X000001-congress-119')).toBeNull();
  });

  it('returns null when readFileSync throws (e.g. permission error)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    expect(readCache('member-X000001-congress-119')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// writeCache
// ---------------------------------------------------------------------------

describe('writeCache', () => {
  it('creates the cache directory and writes a JSON file', () => {
    mockMkdirSync.mockImplementation(() => {});
    mockWriteFileSync.mockImplementation(() => {});

    const data = [{ rollCall: 10 }];
    writeCache('member-S000344-congress-119', data);

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

  it('writes an envelope containing cachedAt and data', () => {
    let written = '';
    mockMkdirSync.mockImplementation(() => {});
    mockWriteFileSync.mockImplementation((_path: string, content: string) => {
      written = content;
    });

    writeCache('test-key', { value: 'hello' });

    const envelope = JSON.parse(written);
    expect(envelope).toHaveProperty('cachedAt');
    expect(envelope).toHaveProperty('data', { value: 'hello' });
    expect(new Date(envelope.cachedAt).getTime()).toBeCloseTo(Date.now(), -3);
  });

  it('fails silently when mkdirSync throws', () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EROFS: read-only file system');
    });
    // Must not throw
    expect(() => writeCache('test-key', { x: 1 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// round-trip: writeCache → readCache
// ---------------------------------------------------------------------------

describe('writeCache then readCache', () => {
  it('writeCache writes a file that readCache can subsequently read', () => {
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
    writeCache('round-trip-key', original);
    const result = readCache<typeof original>('round-trip-key');

    expect(result).toEqual(original);
  });
});
