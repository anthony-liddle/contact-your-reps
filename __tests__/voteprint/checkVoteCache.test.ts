// Tests checkVoteCache — a thin wrapper around readCache.
// Mock fs and @vercel/blob so the cache module loads without real I/O,
// then control readCache's return value via fs mocks to test checkVoteCache.

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  list: jest.fn(),
}));

import { existsSync, readFileSync } from 'fs';
import { checkVoteCache } from '@/lib/voteprint/cache';

const mockExistsSync = existsSync as jest.Mock;
const mockReadFileSync = readFileSync as jest.Mock;

const ORIG_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  jest.clearAllMocks();
  // Use development mode so readCache reads from the file cache
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'development',
    writable: true,
    configurable: true,
  });
  delete process.env.FORCE_BLOB_CACHE;
  delete process.env.VOTEPRINT_BYPASS_CACHE;
});

afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: ORIG_NODE_ENV,
    writable: true,
    configurable: true,
  });
});

describe('checkVoteCache', () => {
  it('returns true when readCache returns non-null data', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ data: [{ congress: 119 }], cachedAt: Date.now() }),
    );

    const result = await checkVoteCache('S000344', 119);

    expect(result).toBe(true);
  });

  it('returns false when readCache returns null (file missing)', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await checkVoteCache('S000344', 119);

    expect(result).toBe(false);
  });

  it('calls readCache with the correct key format', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ data: [{ congress: 118 }], cachedAt: Date.now() }),
    );

    await checkVoteCache('W000187', 118);

    // existsSync is called with a path that contains the key
    expect(mockExistsSync).toHaveBeenCalledWith(
      expect.stringContaining('member-W000187-congress-118'),
    );
  });
});
