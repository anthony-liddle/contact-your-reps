import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoteList from '@/components/VoteList/VoteList';
import type { Vote } from '@/lib/voteprint';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    congress: 119,
    chamber: 'House',
    session: 1,
    rollCall: 1,
    date: '2025-01-15',
    question: 'On Passage',
    description: '',
    result: 'passed',
    voteType: 'Yea-and-Nay',
    bill: null,
    position: 'yea',
    partyMajority: 'yea',
    isPartyBreak: false,
    category: null,
    note: '',
    alignedWithIssue: null,
    ...overrides,
  };
}

const baseProps = {
  repName: 'Brad Sherman',
  repBioguideId: 'S000344',
};

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

describe('VoteList — filter logic', () => {
  const votes: Vote[] = [
    makeVote({ rollCall: 1, position: 'yea' }),
    makeVote({ rollCall: 2, position: 'nay' }),
    makeVote({ rollCall: 3, position: 'absent' }),
    makeVote({ rollCall: 4, position: 'yea', isPartyBreak: true }),
    makeVote({ rollCall: 5, position: 'nay', isPartyBreak: true }),
  ];

  it('renders all votes when filter is "All"', () => {
    render(
      <VoteList
        votes={votes}
        activeCategory={null}
        {...baseProps}
      />,
    );
    // Each vote is an <a> inside an <li>
    const listItems = document.querySelectorAll('ul li');
    expect(listItems).toHaveLength(5);
  });

  it('shows only yea votes when the "Yea" filter is active', async () => {
    const user = userEvent.setup();
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );

    await user.click(screen.getByRole('tab', { name: /yea/i }));
    const listItems = document.querySelectorAll('ul li');
    expect(listItems).toHaveLength(2); // rollCall 1 and 4
  });

  it('shows only nay votes when the "Nay" filter is active', async () => {
    const user = userEvent.setup();
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );

    await user.click(screen.getByRole('tab', { name: /nay/i }));
    const listItems = document.querySelectorAll('ul li');
    expect(listItems).toHaveLength(2); // rollCall 2 and 5
  });

  it('shows only absent votes when the "Absent" filter is active', async () => {
    const user = userEvent.setup();
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );

    await user.click(screen.getByRole('tab', { name: /absent/i }));
    const listItems = document.querySelectorAll('ul li');
    expect(listItems).toHaveLength(1); // rollCall 3
  });

  it('shows only party-break votes when the "Party breaks" filter is active', async () => {
    const user = userEvent.setup();
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );

    await user.click(screen.getByRole('tab', { name: /party breaks/i }));
    const listItems = document.querySelectorAll('ul li');
    expect(listItems).toHaveLength(2); // rollCall 4 and 5
  });

  it('shows an empty state message when no votes match the filter', async () => {
    const user = userEvent.setup();
    const noAbsent = votes.filter((v) => v.position !== 'absent');
    render(
      <VoteList votes={noAbsent} activeCategory={null} {...baseProps} />,
    );

    await user.click(screen.getByRole('tab', { name: /absent/i }));
    expect(screen.getByText(/no votes match/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Party break tag
// ---------------------------------------------------------------------------

describe('VoteList — party break tag', () => {
  it('shows the "Party break" tag only on qualifying votes', () => {
    const votes: Vote[] = [
      makeVote({ rollCall: 1, isPartyBreak: true, question: 'Vote A' }),
      makeVote({ rollCall: 2, isPartyBreak: false, question: 'Vote B' }),
    ];

    render(<VoteList votes={votes} activeCategory={null} {...baseProps} />);

    // Tag has a "≠ " non-color prefix; match exact text to avoid the filter button
    const tagsByText = screen.queryAllByText('≠ Party break');
    expect(tagsByText).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Category badge visibility
// ---------------------------------------------------------------------------

describe('VoteList — category badge', () => {
  const votes: Vote[] = [
    makeVote({
      rollCall: 1,
      category: 'climate-justice',
      question: 'Climate Vote',
    }),
    makeVote({
      rollCall: 2,
      category: 'workers-rights',
      question: 'Workers Vote',
    }),
  ];

  it('shows category badges when activeCategory is null', () => {
    render(<VoteList votes={votes} activeCategory={null} {...baseProps} />);
    expect(screen.getByText('Climate Justice')).toBeInTheDocument();
    expect(screen.getByText("Workers' Rights")).toBeInTheDocument();
  });

  it('hides category badges when a specific activeCategory is set', () => {
    render(
      <VoteList
        votes={votes}
        activeCategory="climate-justice"
        {...baseProps}
      />,
    );
    // Only the climate-justice vote is shown (category filter), and no badge
    expect(screen.queryByText('Climate Justice')).not.toBeInTheDocument();
    expect(screen.queryByText("Workers' Rights")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Alignment tags
// ---------------------------------------------------------------------------

describe('VoteList — alignment tags', () => {
  it('shows ↑ With issue tag when alignedWithIssue is true', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText('↑ With issue')).toBeInTheDocument();
  });

  it('shows ↓ Against issue tag when alignedWithIssue is false', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText('↓ Against issue')).toBeInTheDocument();
  });

  it('shows no alignment tag when alignedWithIssue is null', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: null }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.queryByText('↑ With issue')).not.toBeInTheDocument();
    expect(screen.queryByText('↓ Against issue')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Contact banner — stance-aware text
// ---------------------------------------------------------------------------

describe('VoteList — stance-aware banner', () => {
  it('shows "has consistently supported" when all category votes are aligned', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: true }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(
      screen.getByText(/has consistently supported/i),
    ).toBeInTheDocument();
  });

  it('shows "voted against … N out of N times" when all category votes are opposed', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: false }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(
      screen.getByText(/has voted against/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 out of 2/i)).toBeInTheDocument();
  });

  it('shows mixed "voted with X times and against it Y times" when split', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: true }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: false }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText(/voted with.*1 time.*against it 1 time/i)).toBeInTheDocument();
  });

  it('shows fallback "Concerned about" when total mapped is zero (all null)', () => {
    const votes = [
      makeVote({ rollCall: 1, category: 'climate-justice', alignedWithIssue: null }),
      makeVote({ rollCall: 2, category: 'climate-justice', alignedWithIssue: null }),
    ];
    render(
      <VoteList votes={votes} activeCategory="climate-justice" {...baseProps} />,
    );
    expect(screen.getByText(/concerned about/i)).toBeInTheDocument();
  });

  it('shows generic contact text when no activeCategory', () => {
    const votes = [makeVote({ rollCall: 1, alignedWithIssue: null })];
    render(
      <VoteList votes={votes} activeCategory={null} {...baseProps} />,
    );
    expect(
      screen.getByText(/want to contact/i),
    ).toBeInTheDocument();
  });
});
