/**
 * Tests for the Voteprint canvas component.
 *
 * The canvas getContext API is not available in jsdom, so we mock it and
 * mock getWedgeAtPoint to control hit-detection results without needing
 * a real canvas rendering environment.
 */

// Mock getWedgeAtPoint before any imports — jest.mock is hoisted by Babel/ts-jest
jest.mock('@/lib/voteprint/utils', () => ({
  ...jest.requireActual('@/lib/voteprint/utils'),
  getWedgeAtPoint: jest.fn(),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Voteprint from '@/components/Voteprint/Voteprint';
import { getWedgeAtPoint } from '@/lib/voteprint/utils';
import type { Vote } from '@/lib/voteprint';

const mockGetWedgeAtPoint = getWedgeAtPoint as jest.Mock;

// ---------------------------------------------------------------------------
// Canvas mock — jsdom doesn't implement getContext
// ---------------------------------------------------------------------------

const mockFns = {
  scale: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  quadraticCurveTo: jest.fn(),
};

beforeEach(() => {
  // Provide a stub canvas context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockFns) as any;
  // Stub matchMedia (jsdom doesn't implement it)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
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
    category: 'climate-justice',
    note: '',
    ...overrides,
  };
}

const votes: Vote[] = [
  makeVote({ rollCall: 1, category: 'climate-justice' }),
  makeVote({ rollCall: 2, category: 'climate-justice', position: 'nay' }),
  makeVote({ rollCall: 3, category: 'workers-rights' }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Voteprint', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <Voteprint
        votes={votes}
        activeCategory={null}
        onCategorySelect={jest.fn()}
        repName="Test Rep"
      />,
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('calls onCategorySelect with the clicked category when a wedge is hit', () => {
    const onSelect = jest.fn();
    mockGetWedgeAtPoint.mockReturnValue('climate-justice');

    const { container } = render(
      <Voteprint
        votes={votes}
        activeCategory={null}
        onCategorySelect={onSelect}
        repName="Test Rep"
        size={220}
      />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.click(canvas, { clientX: 120, clientY: 80 });

    expect(onSelect).toHaveBeenCalledWith('climate-justice');
  });

  it('calls onCategorySelect with null when clicking the already-active category (deselect)', () => {
    const onSelect = jest.fn();
    mockGetWedgeAtPoint.mockReturnValue('climate-justice');

    const { container } = render(
      <Voteprint
        votes={votes}
        activeCategory="climate-justice"
        onCategorySelect={onSelect}
        repName="Test Rep"
        size={220}
      />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.click(canvas, { clientX: 120, clientY: 80 });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onCategorySelect with null when clicking empty space (no wedge hit)', () => {
    const onSelect = jest.fn();
    mockGetWedgeAtPoint.mockReturnValue(null);

    const { container } = render(
      <Voteprint
        votes={votes}
        activeCategory={null}
        onCategorySelect={onSelect}
        repName="Test Rep"
        size={220}
      />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.click(canvas, { clientX: 110, clientY: 110 });

    // hit = null, activeCategory = null → null === null → toggle to null
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
