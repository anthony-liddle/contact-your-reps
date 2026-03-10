import { isValidZipCode, getRepresentativesByZip } from '@/lib/civic-api';

const mockFiveCallsResponse = {
  location: 'Beaverton',
  state: 'OR',
  district: '1',
  lowAccuracy: false,
  isSplit: false,
  representatives: [
    {
      id: 'sen-1',
      name: 'Jeff Merkley',
      phone: '202-224-3753',
      url: 'https://merkley.senate.gov',
      party: 'Democrat',
      state: 'OR',
      reason: 'This is one of your two senators.',
      area: 'US Senate',
      field_offices: [{ phone: '503-326-3386', city: 'Portland' }],
    },
    {
      id: 'rep-1',
      name: 'Suzanne Bonamici',
      phone: '202-225-0855',
      url: 'https://bonamici.house.gov',
      party: 'Democrat',
      state: 'OR',
      reason: 'This is your representative in the House.',
      area: 'US House',
    },
  ],
};

describe('getRepresentativesByZip', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFiveCallsResponse),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns error result for invalid ZIP', async () => {
    const result = await getRepresentativesByZip('abc');
    expect(result.error).toMatch(/valid 5-digit/i);
    expect(result.representatives).toHaveLength(0);
  });

  it('fetches and returns representatives for valid ZIP', async () => {
    const result = await getRepresentativesByZip('97006');
    expect(result.representatives).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  it('transforms field_offices to fieldOffices (camelCase)', async () => {
    const result = await getRepresentativesByZip('97006');
    const senator = result.representatives.find((r) => r.area === 'US Senate');
    expect(senator?.fieldOffices).toHaveLength(1);
    expect(senator?.fieldOffices?.[0].city).toBe('Portland');
  });

  it('sorts senators before house representatives', async () => {
    const result = await getRepresentativesByZip('97006');
    expect(result.representatives[0].area).toBe('US Senate');
    expect(result.representatives[1].area).toBe('US House');
  });

  it('returns error when API responds with non-ok status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await getRepresentativesByZip('97006');
    expect(result.error).toBeTruthy();
    expect(result.representatives).toHaveLength(0);
  });

  it('returns error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const result = await getRepresentativesByZip('97006');
    expect(result.error).toBeTruthy();
  });

  it('returns location and state from response', async () => {
    const result = await getRepresentativesByZip('97006');
    expect(result.location).toBe('Beaverton');
    expect(result.state).toBe('OR');
  });

  it('filters out non-federal representatives', async () => {
    const responseWithLocal = {
      ...mockFiveCallsResponse,
      representatives: [
        ...mockFiveCallsResponse.representatives,
        { id: 'local-1', name: 'Local Mayor', phone: '', url: '', party: '', state: 'OR', reason: '', area: 'City Council' },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(responseWithLocal),
    } as Response);
    const result = await getRepresentativesByZip('97006');
    expect(result.representatives.every((r) => r.area === 'US Senate' || r.area === 'US House')).toBe(true);
  });
});

describe('isValidZipCode', () => {
  describe('valid ZIP codes', () => {
    it('accepts 5-digit ZIP codes', () => {
      expect(isValidZipCode('12345')).toBe(true);
      expect(isValidZipCode('00000')).toBe(true);
      expect(isValidZipCode('99999')).toBe(true);
    });

    it('accepts ZIP+4 format', () => {
      expect(isValidZipCode('12345-6789')).toBe(true);
      expect(isValidZipCode('00000-0000')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(isValidZipCode(' 12345 ')).toBe(true);
      expect(isValidZipCode('  12345-6789  ')).toBe(true);
    });
  });

  describe('invalid ZIP codes', () => {
    it('rejects ZIP codes with fewer than 5 digits', () => {
      expect(isValidZipCode('1234')).toBe(false);
      expect(isValidZipCode('123')).toBe(false);
      expect(isValidZipCode('1')).toBe(false);
    });

    it('rejects ZIP codes with more than 5 digits (without +4)', () => {
      expect(isValidZipCode('123456')).toBe(false);
      expect(isValidZipCode('1234567')).toBe(false);
    });

    it('rejects non-numeric characters', () => {
      expect(isValidZipCode('1234a')).toBe(false);
      expect(isValidZipCode('abcde')).toBe(false);
      expect(isValidZipCode('12-345')).toBe(false);
    });

    it('rejects empty strings', () => {
      expect(isValidZipCode('')).toBe(false);
      expect(isValidZipCode('   ')).toBe(false);
    });

    it('rejects invalid ZIP+4 formats', () => {
      expect(isValidZipCode('12345-678')).toBe(false);
      expect(isValidZipCode('12345-67890')).toBe(false);
      expect(isValidZipCode('1234-56789')).toBe(false);
    });
  });
});
