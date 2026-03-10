/**
 * @jest-environment node
 */
import { GET } from '@/app/api/representatives/route';
import { NextRequest } from 'next/server';

const mockApiResponse = {
  location: 'Beaverton',
  state: 'OR',
  district: '1',
  lowAccuracy: false,
  isSplit: false,
  representatives: [
    {
      id: 'rep-1',
      name: 'Jane Smith',
      phone: '202-224-1234',
      url: 'https://smith.senate.gov',
      party: 'Democrat',
      state: 'OR',
      reason: 'This is one of your senators.',
      area: 'US Senate',
    },
  ],
};

describe('GET /api/representatives', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when zip param is missing', async () => {
    const req = new NextRequest('http://localhost/api/representatives');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid zip/i);
  });

  it('returns 400 for non-5-digit zip', async () => {
    const req = new NextRequest('http://localhost/api/representatives?zip=123');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for alphabetic zip', async () => {
    const req = new NextRequest('http://localhost/api/representatives?zip=abcde');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with data for valid zip', async () => {
    const req = new NextRequest('http://localhost/api/representatives?zip=97006');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.representatives).toHaveLength(1);
  });

  it('returns 500 when upstream API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });
    const req = new NextRequest('http://localhost/api/representatives?zip=97006');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch/i);
  });

  it('returns 500 when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const req = new NextRequest('http://localhost/api/representatives?zip=97006');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
