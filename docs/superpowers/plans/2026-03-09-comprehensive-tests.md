# Comprehensive Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive unit, component, and integration tests covering all untested components, lib functions, the API route, and the full user flow.

**Architecture:** Seven new test files following the existing `@testing-library/react` + `userEvent` + `jest` patterns. Component tests render in isolation with mocked props. Integration tests mock `fetch` at the global level and exercise the full `Home` page state machine.

**Tech Stack:** Jest 30, @testing-library/react 16, @testing-library/user-event 14, @testing-library/jest-dom 6, Next.js 16 route handler testing via `NextRequest`.

---

## Chunk 1: Component Tests

### Task 1: RepresentativeCard tests

**Files:**
- Create: `__tests__/components/RepresentativeCard.test.tsx`

**Context:** `RepresentativeCard` receives a `Representative` prop and renders name, title (Senator vs Representative), party, DC phone, optional field office phone, and a website link. `area === 'US Senate'` → "Senator", otherwise "Representative". Photo is optional — shows placeholder emoji if absent.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import RepresentativeCard from '@/components/RepresentativeCard';
import type { Representative } from '@/lib/types';

const baseSenator: Representative = {
  id: 'sen-1',
  name: 'Jane Smith',
  phone: '202-224-1234',
  url: 'https://smith.senate.gov',
  party: 'Democrat',
  state: 'OR',
  reason: 'This is one of your two senators.',
  area: 'US Senate',
};

const baseRep: Representative = {
  id: 'rep-1',
  name: 'John Doe',
  phone: '202-225-5678',
  url: 'https://doe.house.gov',
  party: 'Republican',
  state: 'OR',
  reason: 'This is your representative in the House.',
  area: 'US House',
};

describe('RepresentativeCard', () => {
  it('renders Senator title for US Senate area', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.getByText(/Senator Jane Smith/i)).toBeInTheDocument();
  });

  it('renders Representative title for US House area', () => {
    render(<RepresentativeCard representative={baseRep} />);
    expect(screen.getByText(/Representative John Doe/i)).toBeInTheDocument();
  });

  it('shows party label', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.getByText(/Democrat/i)).toBeInTheDocument();
  });

  it('shows DC office phone number', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.getByText('202-224-1234')).toBeInTheDocument();
  });

  it('shows website link with correct href', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    const link = screen.getByRole('link', { name: /website/i });
    expect(link).toHaveAttribute('href', 'https://smith.senate.gov');
  });

  it('shows field office phone when provided', () => {
    const rep: Representative = {
      ...baseSenator,
      fieldOffices: [{ phone: '503-555-0100', city: 'Portland' }],
    };
    render(<RepresentativeCard representative={rep} />);
    expect(screen.getByText('503-555-0100')).toBeInTheDocument();
  });

  it('does not show field office section when none provided', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.queryByText(/office/i)).not.toBeInTheDocument();
  });

  it('shows photo when photoUrl is provided', () => {
    const rep: Representative = { ...baseSenator, photoUrl: 'https://example.com/photo.jpg' };
    render(<RepresentativeCard representative={rep} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows placeholder when no photoUrl', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true }) ?? screen.getByText('🏛️')).toBeTruthy();
  });

  it('shows reason text', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.getByText('This is one of your two senators.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/components/RepresentativeCard.test.tsx
```

Expected: FAIL — "cannot find module" or assertion failures.

- [ ] **Step 3: Fix the placeholder test** — the `queryByRole('img')` approach for the placeholder may need adjustment based on actual DOM output. Run `pnpm dev`, open the card, and check whether the emoji renders in a `span` with `role="img"`. Update the test to match:

```tsx
// If placeholder uses role="img" on a span:
expect(screen.getByRole('img', { name: /placeholder/i })).toBeInTheDocument();
// Or simply check for absence of <img> element:
expect(screen.queryByAltText(/photo of/i)).not.toBeInTheDocument();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/components/RepresentativeCard.test.tsx
```

Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add __tests__/components/RepresentativeCard.test.tsx
git commit -m "test(components): add RepresentativeCard tests"
```

---

### Task 2: MessagePreview tests

**Files:**
- Create: `__tests__/components/MessagePreview.test.tsx`

**Context:** `MessagePreview` receives `message: GeneratedMessage`, `editedBody: string | null`, and `onBodyChange: (body: string) => void`. It renders a read-only subject input and an editable textarea. The displayed body is `editedBody ?? message.body`. Clipboard copy is async — mock `navigator.clipboard.writeText`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagePreview from '@/components/MessagePreview';
import type { GeneratedMessage } from '@/lib/types';

const mockMessage: GeneratedMessage = {
  to: 'Senator Jane Smith',
  subject: 'Constituent Priorities: Healthcare',
  body: 'Dear Senator Smith,\n\nI am writing about healthcare.\n\nSincerely,\n[Your Name]',
};

describe('MessagePreview', () => {
  const mockOnBodyChange = jest.fn();

  beforeEach(() => {
    mockOnBodyChange.mockClear();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders subject field with message subject', () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const input = screen.getByLabelText(/subject/i) as HTMLInputElement;
    expect(input.value).toBe('Constituent Priorities: Healthcare');
  });

  it('renders message body from message prop when editedBody is null', () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const textarea = screen.getByLabelText(/message/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Dear Senator Smith');
  });

  it('renders editedBody instead of message.body when provided', () => {
    render(
      <MessagePreview
        message={mockMessage}
        editedBody="My custom edit"
        onBodyChange={mockOnBodyChange}
      />
    );
    const textarea = screen.getByLabelText(/message/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('My custom edit');
  });

  it('calls onBodyChange when user types in the textarea', async () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const textarea = screen.getByLabelText(/message/i);
    await userEvent.type(textarea, 'X');
    expect(mockOnBodyChange).toHaveBeenCalled();
  });

  it('copies message to clipboard when copy button clicked', async () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const button = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('shows success status after copying', async () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('uses editedBody for clipboard content when provided', async () => {
    render(
      <MessagePreview
        message={mockMessage}
        editedBody="My personalized text"
        onBodyChange={mockOnBodyChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => {
      const writeText = navigator.clipboard.writeText as jest.Mock;
      expect(writeText.mock.calls[0][0]).toContain('My personalized text');
    });
  });

  it('shows personalization note', () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    expect(screen.getByText(/form letters/i)).toBeInTheDocument();
  });

  it('subject field is read-only', () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const input = screen.getByLabelText(/subject/i) as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/components/MessagePreview.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Run tests to verify they pass**

```bash
pnpm test __tests__/components/MessagePreview.test.tsx
```

Expected: PASS all tests.

- [ ] **Step 4: Commit**

```bash
git add __tests__/components/MessagePreview.test.tsx
git commit -m "test(components): add MessagePreview tests"
```

---

### Task 3: ConfirmTemplateModal tests

**Files:**
- Create: `__tests__/components/ConfirmTemplateModal.test.tsx`

**Context:** `ConfirmTemplateModal` uses the native HTML `<dialog>` element. jsdom does not implement `showModal()` or `close()` — mock them on the prototype. The component listens for the `cancel` event (fired by Escape) and calls `onKeep`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmTemplateModal from '@/components/ConfirmTemplateModal';

describe('ConfirmTemplateModal', () => {
  const mockOnUpdate = jest.fn();
  const mockOnKeep = jest.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnKeep.mockClear();
    // jsdom does not implement dialog methods — mock them
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();
  });

  it('calls showModal when open becomes true', () => {
    render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('does not call showModal when open is false', () => {
    render(
      <ConfirmTemplateModal open={false} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it('renders title when open', () => {
    render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    expect(screen.getByText(/your selections changed/i)).toBeInTheDocument();
  });

  it('calls onUpdate when "Update message" button clicked', () => {
    render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    fireEvent.click(screen.getByRole('button', { name: /update message/i }));
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });

  it('calls onKeep when "Keep my edits" button clicked', () => {
    render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    fireEvent.click(screen.getByRole('button', { name: /keep my edits/i }));
    expect(mockOnKeep).toHaveBeenCalledTimes(1);
  });

  it('calls onKeep when Escape key fires cancel event', () => {
    render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(mockOnKeep).toHaveBeenCalledTimes(1);
  });

  it('calls close when open becomes false', () => {
    const { rerender } = render(
      <ConfirmTemplateModal open={true} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    rerender(
      <ConfirmTemplateModal open={false} onUpdate={mockOnUpdate} onKeep={mockOnKeep} />
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/components/ConfirmTemplateModal.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Run tests to verify they pass**

```bash
pnpm test __tests__/components/ConfirmTemplateModal.test.tsx
```

Expected: PASS all tests.

- [ ] **Step 4: Commit**

```bash
git add __tests__/components/ConfirmTemplateModal.test.tsx
git commit -m "test(components): add ConfirmTemplateModal tests"
```

---

## Chunk 2: Lib, Data, and API Tests

### Task 4: legislators-data tests

**Files:**
- Create: `__tests__/lib/legislators-data.test.ts`

**Context:** `normalizeName` and `namesMatch` are not exported — test them indirectly via `findLegislator`. `fetchLegislatorsData` uses `localStorage` for caching and calls `fetch`. Mock `global.fetch` and `localStorage` in each test.

- [ ] **Step 1: Write the failing tests**

```ts
import { fetchLegislatorsData, findLegislator } from '@/lib/legislators-data';
import type { LegislatorInfo } from '@/lib/legislators-data';

const mockLegislators: LegislatorInfo[] = [
  {
    bioguideId: 'S000033',
    firstName: 'Bernard',
    lastName: 'Sanders',
    officialFullName: 'Bernard Sanders',
    state: 'VT',
    type: 'sen',
    party: 'Independent',
    websiteUrl: 'https://sanders.senate.gov',
  },
  {
    bioguideId: 'W000779',
    firstName: 'Ron',
    lastName: 'Wyden',
    officialFullName: 'Ron Wyden',
    state: 'OR',
    type: 'sen',
    party: 'Democrat',
    websiteUrl: 'https://wyden.senate.gov',
  },
];

describe('findLegislator', () => {
  it('finds legislator by exact official full name', () => {
    const result = findLegislator('Bernard Sanders', 'VT', mockLegislators);
    expect(result).not.toBeNull();
    expect(result?.bioguideId).toBe('S000033');
  });

  it('finds legislator by first + last name', () => {
    const result = findLegislator('Ron Wyden', 'OR', mockLegislators);
    expect(result).not.toBeNull();
    expect(result?.bioguideId).toBe('W000779');
  });

  it('returns null when state does not match', () => {
    const result = findLegislator('Ron Wyden', 'CA', mockLegislators);
    expect(result).toBeNull();
  });

  it('returns null when name does not match any legislator', () => {
    const result = findLegislator('Unknown Person', 'OR', mockLegislators);
    expect(result).toBeNull();
  });

  it('is case-insensitive for state matching', () => {
    const result = findLegislator('Ron Wyden', 'or', mockLegislators);
    expect(result).not.toBeNull();
  });

  it('handles name normalization (periods, extra spaces)', () => {
    const result = findLegislator('Ron  Wyden', 'OR', mockLegislators);
    expect(result).not.toBeNull();
  });
});

describe('fetchLegislatorsData', () => {
  const CACHE_KEY = 'congress-legislators-data';

  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: { bioguide: 'W000779' },
              name: { first: 'Ron', last: 'Wyden', official_full: 'Ron Wyden' },
              bio: {},
              terms: [
                {
                  type: 'sen',
                  start: '2023-01-03',
                  end: '2029-01-03',
                  state: 'OR',
                  party: 'Democrat',
                  url: 'https://wyden.senate.gov',
                },
              ],
            },
          ]),
      } as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches and returns legislators from API', async () => {
    const legislators = await fetchLegislatorsData();
    expect(legislators).toHaveLength(1);
    expect(legislators[0].lastName).toBe('Wyden');
  });

  it('uses cached data when cache is fresh', async () => {
    const cacheData = {
      timestamp: Date.now(),
      legislators: mockLegislators,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    const legislators = await fetchLegislatorsData();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(legislators).toHaveLength(mockLegislators.length);
  });

  it('re-fetches when cache is expired', async () => {
    const cacheData = {
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      legislators: mockLegislators,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    await fetchLegislatorsData();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('returns empty array on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const legislators = await fetchLegislatorsData();
    expect(legislators).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/lib/legislators-data.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/legislators-data.test.ts
```

Expected: PASS all tests.

- [ ] **Step 4: Commit**

```bash
git add __tests__/lib/legislators-data.test.ts
git commit -m "test(lib): add legislators-data tests"
```

---

### Task 5: Issues data and API route tests

**Files:**
- Create: `__tests__/data/issues.test.ts`
- Create: `__tests__/app/api/representatives.test.ts`

**Context:** Issues data validation is purely structural — no mocking needed. API route tests use `NextRequest` directly and mock `global.fetch` to control the upstream 5calls.org response.

- [ ] **Step 1: Write the failing issues tests**

```ts
// __tests__/data/issues.test.ts
import { issues } from '@/data/issues';

describe('issues data', () => {
  it('contains at least one issue', () => {
    expect(issues.length).toBeGreaterThan(0);
  });

  it('every issue has required fields', () => {
    for (const issue of issues) {
      expect(issue.id).toBeTruthy();
      expect(issue.title).toBeTruthy();
      expect(issue.description).toBeTruthy();
      expect(issue.messageParagraph).toBeTruthy();
    }
  });

  it('all issue IDs are unique', () => {
    const ids = issues.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all issue IDs are non-empty strings', () => {
    for (const issue of issues) {
      expect(typeof issue.id).toBe('string');
      expect(issue.id.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Write the failing API route tests**

```ts
// __tests__/app/api/representatives.test.ts
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
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
    );
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test __tests__/data/issues.test.ts __tests__/app/api/representatives.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/data/issues.test.ts __tests__/app/api/representatives.test.ts
```

Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add __tests__/data/issues.test.ts __tests__/app/api/representatives.test.ts
git commit -m "test(data,api): add issues data and API route tests"
```

---

### Task 6: Extend civic-api tests

**Files:**
- Modify: `__tests__/lib/civic-api.test.ts`

**Context:** The existing file only tests `isValidZipCode`. Add tests for `getRepresentativesByZip`, which calls `fetch('/api/representatives?zip=...')`. Mock `global.fetch`.

- [ ] **Step 1: Append the following to the existing test file**

```ts
import { getRepresentativesByZip } from '@/lib/civic-api';

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
    jest.spyOn(global, 'fetch').mockResolvedValue({
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
pnpm test __tests__/lib/civic-api.test.ts
```

Expected: existing tests PASS, new tests FAIL.

- [ ] **Step 3: Run tests to verify all pass**

```bash
pnpm test __tests__/lib/civic-api.test.ts
```

Expected: PASS all tests (including existing 7).

- [ ] **Step 4: Commit**

```bash
git add __tests__/lib/civic-api.test.ts
git commit -m "test(lib): add getRepresentativesByZip tests"
```

---

## Chunk 3: Integration Tests

### Task 7: Full page integration tests

**Files:**
- Create: `__tests__/app/page.test.tsx`

**Context:** `Home` in `app/page.tsx` is a client component that orchestrates the full user flow. Mock `global.fetch` to control the `/api/representatives` response. The `ConfirmTemplateModal` uses native `<dialog>` — mock `showModal` and `close` on the prototype. Clipboard also needs mocking. Use `waitFor` for async state updates following ZIP submission.

Key flows to test:
1. Initial render
2. ZIP submission → loading → representatives shown
3. ZIP submission → error shown
4. Issue selection → message updates
5. Edit message → change selections → modal appears
6. Modal "Update message" → selections applied, edits cleared
7. Modal "Keep my edits" → selections reverted, edits preserved
8. "Change ZIP Code" → reset to initial state

- [ ] **Step 1: Write the failing integration tests**

```tsx
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

const mockApiResponse = {
  location: 'Beaverton',
  state: 'OR',
  district: '1',
  lowAccuracy: false,
  isSplit: false,
  representatives: [
    {
      id: 'sen-merkley',
      name: 'Jeff Merkley',
      phone: '202-224-3753',
      url: 'https://merkley.senate.gov',
      photoURL: undefined,
      party: 'Democrat',
      state: 'OR',
      reason: 'This is one of your two senators.',
      area: 'US Senate',
      field_offices: [],
    },
    {
      id: 'rep-bonamici',
      name: 'Suzanne Bonamici',
      phone: '202-225-0855',
      url: 'https://bonamici.house.gov',
      photoURL: undefined,
      party: 'Democrat',
      state: 'OR',
      reason: 'This is your representative in the House.',
      area: 'US House',
      field_offices: [],
    },
  ],
};

async function submitZip(zip = '97006') {
  const input = screen.getByLabelText(/zip code/i);
  await userEvent.type(input, zip);
  fireEvent.click(screen.getByRole('button', { name: /find.*representatives/i }));
}

describe('Home page integration', () => {
  beforeEach(() => {
    // Mock fetch to return representatives
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    // jsdom doesn't implement dialog natively
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('renders ZIP code input on initial load', () => {
    render(<Home />);
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.queryByText(/your federal representatives/i)).not.toBeInTheDocument();
  });

  // ── ZIP submission flow ────────────────────────────────────────────────────

  it('shows representatives after valid ZIP submission', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/your federal representatives/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Jeff Merkley/i)).toBeInTheDocument();
    expect(screen.getByText(/Suzanne Bonamici/i)).toBeInTheDocument();
  });

  it('shows location info after successful lookup', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/Beaverton/i)).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/unable to fetch/i)).toBeInTheDocument();
    });
  });

  it('shows error when API returns error in body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'ZIP not found', representatives: [] }),
    } as Response);
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/ZIP not found/i)).toBeInTheDocument();
    });
  });

  // ── Issue selection → message ──────────────────────────────────────────────

  it('shows issue selector after representatives load', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/select the issues/i)).toBeInTheDocument();
    });
  });

  it('selecting an issue updates the generated message subject', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    // Click the first checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      const subject = screen.getByLabelText(/subject/i) as HTMLInputElement;
      expect(subject.value).not.toBe('');
    });
  });

  // ── Edit + selection change → modal ───────────────────────────────────────

  it('shows modal when user edits message then changes issue selection', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    // Select an issue to generate a message
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // Edit the generated message
    const textarea = screen.getByLabelText(/message/i);
    await userEvent.type(textarea, ' My personal addition');

    // Change selections — should trigger modal
    fireEvent.click(checkboxes[1]);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('"Update message" applies new selections and clears edits', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const textarea = screen.getByLabelText(/message/i);
    await userEvent.type(textarea, ' My edit');

    fireEvent.click(checkboxes[1]);

    // Click "Update message" button
    fireEvent.click(screen.getByRole('button', { name: /update message/i }));

    await waitFor(() => {
      const ta = screen.getByLabelText(/message/i) as HTMLTextAreaElement;
      expect(ta.value).not.toContain('My edit');
    });
  });

  it('"Keep my edits" preserves edited text', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const textarea = screen.getByLabelText(/message/i);
    await userEvent.type(textarea, ' My personal edit');

    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: /keep my edits/i }));

    await waitFor(() => {
      const ta = screen.getByLabelText(/message/i) as HTMLTextAreaElement;
      expect(ta.value).toContain('My personal edit');
    });
  });

  // ── Reset ──────────────────────────────────────────────────────────────────

  it('"Change ZIP Code" resets to initial state', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/your federal representatives/i));

    fireEvent.click(screen.getByRole('button', { name: /change zip code/i }));

    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.queryByText(/your federal representatives/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/app/page.test.tsx
```

Expected: FAIL — some tests will fail due to missing mock setup, missing elements, or async timing.

- [ ] **Step 3: Diagnose and fix failures one at a time**

Common issues and fixes:
- If `Home` imports server components or route handlers, mock those modules at the top of the test file with `jest.mock('@/lib/civic-api', () => ({ getRepresentativesByZip: jest.fn() }))` and control return values per test.
- If `fetch` mock doesn't intercept correctly, the `civic-api` module calls `fetch('/api/...')` — in jsdom there's no server, so mock the module directly instead:

```tsx
jest.mock('@/lib/civic-api', () => ({
  ...jest.requireActual('@/lib/civic-api'),
  getRepresentativesByZip: jest.fn(),
}));

import { getRepresentativesByZip } from '@/lib/civic-api';
const mockGetReps = getRepresentativesByZip as jest.Mock;
```

Then in `beforeEach`:
```tsx
mockGetReps.mockResolvedValue({
  representatives: [/* mock reps */],
  location: 'Beaverton',
  state: 'OR',
});
```

- [ ] **Step 4: Run the full test suite to verify no regressions**

```bash
pnpm test
```

Expected: All tests pass (39 existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/app/page.test.tsx
git commit -m "test(integration): add full Home page integration tests"
```

---

## Final Step: PR

- [ ] **Run full test suite and build**

```bash
pnpm test && pnpm build
```

Expected: All tests pass, build succeeds.

- [ ] **Open PR**

```bash
# Run /pr skill
```
