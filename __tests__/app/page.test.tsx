import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock getRepresentativesByZip at the module level — jsdom has no server to
// handle the /api/representatives fetch, so we mock the lib function directly.
jest.mock('@/lib/civic-api', () => ({
  ...jest.requireActual('@/lib/civic-api'),
  getRepresentativesByZip: jest.fn(),
}));

import { getRepresentativesByZip } from '@/lib/civic-api';
const mockGetReps = getRepresentativesByZip as jest.Mock;

const mockRepresentatives = [
  {
    id: 'sen-merkley',
    name: 'Jeff Merkley',
    phone: '202-224-3753',
    url: 'https://merkley.senate.gov',
    party: 'Democrat',
    state: 'OR',
    reason: 'This is one of your two senators.',
    area: 'US Senate',
  },
  {
    id: 'rep-bonamici',
    name: 'Suzanne Bonamici',
    phone: '202-225-0855',
    url: 'https://bonamici.house.gov',
    party: 'Democrat',
    state: 'OR',
    reason: 'This is your representative in the House.',
    area: 'US House',
  },
];

const mockSuccessResult = {
  representatives: mockRepresentatives,
  location: 'Beaverton',
  state: 'OR',
};

async function submitZip(zip = '97006') {
  const input = screen.getByLabelText(/zip code/i);
  await userEvent.type(input, zip);
  fireEvent.click(screen.getByRole('button', { name: /find.*representatives/i }));
}

describe('Home page integration', () => {
  beforeEach(() => {
    mockGetReps.mockResolvedValue(mockSuccessResult);

    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });

    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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
    mockGetReps.mockResolvedValueOnce({
      representatives: [],
      error: 'Unable to fetch representative information. Please try again later.',
    });
    render(<Home />);
    await submitZip();
    await waitFor(() => {
      expect(screen.getByText(/unable to fetch/i)).toBeInTheDocument();
    });
  });

  it('shows error when API returns error in body', async () => {
    mockGetReps.mockResolvedValueOnce({
      representatives: [],
      error: 'ZIP not found',
    });
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

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const textarea = screen.getByLabelText('Message:');
    await userEvent.type(textarea, ' My personal addition');

    fireEvent.click(checkboxes[1]);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('"Update message" applies new selections and clears edits', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const textarea = screen.getByLabelText('Message:');
    await userEvent.type(textarea, ' My edit');

    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: /update message/i }));

    await waitFor(() => {
      const ta = screen.getByLabelText('Message:') as HTMLTextAreaElement;
      expect(ta.value).not.toContain('My edit');
    });
  });

  it('"Keep my edits" preserves edited text', async () => {
    render(<Home />);
    await submitZip();
    await waitFor(() => screen.getByText(/select the issues/i));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const textarea = screen.getByLabelText('Message:');
    await userEvent.type(textarea, ' My personal edit');

    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: /keep my edits/i }));

    await waitFor(() => {
      const ta = screen.getByLabelText('Message:') as HTMLTextAreaElement;
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

  // ── Vote context ───────────────────────────────────────────────────────────

  it('reads voteContext from sessionStorage on mount and clears it', async () => {
    const voteCtx = {
      category: 'trans-rights',
      repId: 'rep-bonamici',
      repName: 'Suzanne Bonamici',
      votes: [
        {
          billNumber: 'H.R. 5184',
          billTitle: 'Protection of Women and Girls in Sports Act',
          question: 'On Passage',
          date: '2026-01-09',
          position: 'yea',
          alignedWithIssue: false,
          note: '',
        },
      ],
    };
    sessionStorage.setItem('cyr_vote_context', JSON.stringify(voteCtx));

    render(<Home />);

    // sessionStorage entry should be cleared immediately on mount
    expect(sessionStorage.getItem('cyr_vote_context')).toBeNull();
  });

  it('shows vote context indicator after reps load when voteContext is present', async () => {
    const voteCtx = {
      category: 'trans-rights',
      repId: 'rep-bonamici',
      repName: 'Suzanne Bonamici',
      votes: [],
    };
    sessionStorage.setItem('cyr_vote_context', JSON.stringify(voteCtx));
    sessionStorage.setItem('cyr_zip', '97006');

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/this message references suzanne bonamici/i),
      ).toBeInTheDocument();
    });
  });

  it('dismissing the vote context indicator hides the banner', async () => {
    const voteCtx = {
      category: 'trans-rights',
      repId: 'rep-bonamici',
      repName: 'Suzanne Bonamici',
      votes: [],
    };
    sessionStorage.setItem('cyr_vote_context', JSON.stringify(voteCtx));
    sessionStorage.setItem('cyr_zip', '97006');

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/this message references/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove vote context/i }));

    expect(screen.queryByText(/this message references/i)).not.toBeInTheDocument();
  });
});
