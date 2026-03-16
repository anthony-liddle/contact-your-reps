// Tests the cache integration inside fetchMemberVotes.
// The cache module itself is mocked here — cache.test.ts covers it in isolation.
jest.mock('@/lib/voteprint/cache', () => ({
  readCache: jest.fn(),
  writeCache: jest.fn(),
}));

import { readCache, writeCache } from '@/lib/voteprint/cache';
import { fetchMemberVotes } from '@/lib/voteprint/fetchMemberVotes';
import bradShermanFixture from '@/lib/voteprint/__fixtures__/brad-sherman.json';

const mockReadCache = readCache as jest.Mock;
const mockWriteCache = writeCache as jest.Mock;

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  global.fetch = jest.fn();
  // Ensure we're not in production so the file cache is active
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true,
  });
  delete process.env.VOTEPRINT_BYPASS_CACHE;
});

afterEach(() => {
  jest.resetAllMocks();
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: originalNodeEnv,
    writable: true,
    configurable: true,
  });
  delete process.env.VOTEPRINT_BYPASS_CACHE;
});

describe('fetchMemberVotes — cache integration', () => {
  it('returns cached data without making any fetch calls when a valid cache entry exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockReadCache.mockReturnValue(bradShermanFixture as any);

    const result = await fetchMemberVotes('S000344', 119);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(bradShermanFixture);
  });

  it('uses the correct cache key format: member-{bioguideId}-congress-{congress}', async () => {
    mockReadCache.mockReturnValue(null);
    // fetch throws so we can observe the cache key without needing a full response
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));

    await fetchMemberVotes('W000187', 118).catch(() => {});

    expect(mockReadCache).toHaveBeenCalledWith('member-W000187-congress-118');
  });

  it('writes to the cache after a successful full fetch', async () => {
    mockReadCache.mockReturnValue(null);

    // Simulate a minimal successful API response: one page with zero votes
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          houseRollCallVotes: [],
          pagination: { count: 0 },
        }),
    });

    await fetchMemberVotes('S000344', 119);

    expect(mockWriteCache).toHaveBeenCalledWith('member-S000344-congress-119', []);
  });

  it('skips the file cache when VOTEPRINT_BYPASS_CACHE is "true"', async () => {
    process.env.VOTEPRINT_BYPASS_CACHE = 'true';
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));

    await fetchMemberVotes('S000344', 119).catch(() => {});

    expect(mockReadCache).not.toHaveBeenCalled();
    expect(mockWriteCache).not.toHaveBeenCalled();
  });

  it('skips the file cache in production (NODE_ENV === "production")', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));

    await fetchMemberVotes('S000344', 119).catch(() => {});

    expect(mockReadCache).not.toHaveBeenCalled();
    expect(mockWriteCache).not.toHaveBeenCalled();
  });
});
