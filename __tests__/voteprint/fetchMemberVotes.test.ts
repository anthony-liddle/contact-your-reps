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

  it('reads from cache in production (NODE_ENV === "production") and short-circuits on hit', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockReadCache.mockReturnValue(bradShermanFixture as any);

    const result = await fetchMemberVotes('S000344', 119);

    expect(mockReadCache).toHaveBeenCalledWith('member-S000344-congress-119');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(bradShermanFixture);
  });

  it('writes to cache in production after a full fetch', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });
    mockReadCache.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ houseRollCallVotes: [], pagination: { count: 0 } }),
    });

    await fetchMemberVotes('S000344', 119);

    expect(mockWriteCache).toHaveBeenCalledWith('member-S000344-congress-119', []);
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates roll call list entries with sequential roll call numbers. */
function makeListEntries(count: number, startRollCall = 1) {
  return Array.from({ length: count }, (_, i) => ({
    rollCallNumber: startRollCall + i,
    result: 'Passed',
    voteType: 'Yea-and-Nay',
    startDate: '2025-01-15',
  }));
}

/**
 * Builds a fetch mock that returns sensible responses for all three endpoint
 * types (list, detail, members).
 *
 * - List endpoint: returns `entries` with `pagination.count = total`
 * - Detail endpoint: returns a minimal vote detail
 * - Members endpoint: returns a single member result for `bioguideId`
 *   so that `assembleVote` always produces a vote record
 * - Any subsequent list fetch (offset > 0 or session 2) returns 404
 */
function makeFetchMock(
  bioguideId: string,
  entries: ReturnType<typeof makeListEntries>,
  total: number,
) {
  let listCallCount = 0;
  return (url: string) => {
    // Members endpoint
    if (url.includes('/members?')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVoteMemberVotes: {
              results: [{ bioguideID: bioguideId, voteCast: 'Yea' }],
            },
          }),
      });
    }

    // Detail endpoint — three URL segments after /house-vote/ before the query
    if (/\/house-vote\/\d+\/\d+\/\d+\?/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVote: {
              voteQuestion: 'On Passage',
              votePartyTotal: [
                { voteParty: 'D', yeaTotal: 200, nayTotal: 5, notVotingTotal: 0 },
                { voteParty: 'R', yeaTotal: 3, nayTotal: 210, notVotingTotal: 0 },
              ],
            },
          }),
      });
    }

    // List endpoint — first call returns entries; subsequent calls return 404
    listCallCount += 1;
    if (listCallCount === 1) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            houseRollCallVotes: entries,
            pagination: { count: total },
          }),
      });
    }

    // Session 2 / additional pages
    return Promise.resolve({ ok: false, status: 404 });
  };
}

// ---------------------------------------------------------------------------
// onProgress tests
// ---------------------------------------------------------------------------

describe('fetchMemberVotes — onProgress callback', () => {
  const BIOGUIDE = 'S000344';
  // VOTE_BATCH_SIZE = 5 (internal constant in fetchMemberVotes.ts)
  const BATCH_SIZE = 5;

  const originalApiKey = process.env.CONGRESS_GOV_API_KEY;

  beforeEach(() => {
    // These tests need a real API key in process.env so that getApiKey() inside
    // fetchMemberVotes doesn't throw before fetch() is called.
    process.env.CONGRESS_GOV_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.CONGRESS_GOV_API_KEY = originalApiKey;
  });

  it('calls onProgress once per batch as roll calls are processed', async () => {
    // 10 entries = 2 batches of 5; total from pagination = 10
    const entries = makeListEntries(10);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, 10),
    );
    mockReadCache.mockReturnValue(null);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    // Intermediate calls: one per batch (2 batches)
    // Final call: (totalChecked, totalChecked)
    // Total: 3 calls
    const calls = onProgress.mock.calls;
    // First batch
    expect(calls[0]).toEqual([BATCH_SIZE, 10]);
    // Second batch
    expect(calls[1]).toEqual([BATCH_SIZE * 2, 10]);
    // Final completion call (totalChecked = 10, totalChecked = 10)
    expect(calls[2]).toEqual([10, 10]);
    expect(calls).toHaveLength(3);
  });

  it('fires final onProgress(n, n) after all sessions complete, regardless of environment', async () => {
    const entries = makeListEntries(BATCH_SIZE); // exactly 1 batch
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, BATCH_SIZE),
    );
    mockReadCache.mockReturnValue(null);

    // Test in non-production (dev) mode — NODE_ENV is already 'test'
    const onProgressDev = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgressDev);

    const devCalls = onProgressDev.mock.calls;
    const lastDevCall = devCalls[devCalls.length - 1];
    // Final call has fetched === total
    expect(lastDevCall[0]).toBe(lastDevCall[1]);

    // Test in production mode
    jest.resetAllMocks();
    mockReadCache.mockReturnValue(null);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, BATCH_SIZE),
    );
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    const onProgressProd = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgressProd);

    const prodCalls = onProgressProd.mock.calls;
    const lastProdCall = prodCalls[prodCalls.length - 1];
    expect(lastProdCall[0]).toBe(lastProdCall[1]);
  });

  it('does not call onProgress when the cache already has data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockReadCache.mockReturnValue([{ congress: 119 }] as any);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    expect(onProgress).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('provides total from pagination count on the first onProgress call', async () => {
    // total from pagination = 50; only BATCH_SIZE entries in the response
    const entries = makeListEntries(BATCH_SIZE);
    (global.fetch as jest.Mock).mockImplementation(
      makeFetchMock(BIOGUIDE, entries, 50),
    );
    mockReadCache.mockReturnValue(null);

    const onProgress = jest.fn();
    await fetchMemberVotes(BIOGUIDE, 119, onProgress);

    // First intermediate call: fetched=5, total=50 (from pagination.count)
    expect(onProgress.mock.calls[0]).toEqual([BATCH_SIZE, 50]);
  });
});
