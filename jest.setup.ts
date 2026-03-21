import '@testing-library/jest-dom';

// Stub global fetch for test environments where it is not natively available
// (Node < 18 / jsdom). Tests that fire background fetch calls (e.g., the
// voteprint cache-warming in app/page.tsx) need this so the call doesn't throw
// "fetch is not defined". The stub returns a resolved Promise — callers that
// care about the response should mock fetch themselves in their own test file.
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  ) as unknown as typeof fetch;
}
