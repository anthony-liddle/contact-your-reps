/**
 * Tests for the RepHeader client component.
 *
 * RepHeader reads from sessionStorage on mount. Tests use beforeEach to
 * set/clear sessionStorage, and flush the useEffect with act().
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import RepHeader from '@/components/RepHeader/RepHeader';
import type { Representative } from '@/lib/types';

const mockRep: Representative = {
  id: 'B001305',
  name: 'Aaron Bean',
  party: 'Republican',
  state: 'FL',
  phone: '202-225-0123',
  url: 'https://bean.house.gov',
  photoUrl: 'https://example.com/bean.jpg',
  area: 'US House',
  reason: 'Your representative.',
};

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

const defaultProps = {
  bioguideId: 'B001305',
  party: 'Republican' as const,
  chamber: 'House' as const,
};

describe('RepHeader — fallback state', () => {
  it('renders fallback "?" avatar when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders fallback "Representative" name when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /representative/i })).toBeInTheDocument();
  });

  it('renders fallback notice text when sessionStorage is empty', () => {
    render(<RepHeader {...defaultProps} />);
    expect(
      screen.getByText(/visit from the main page for full representative details/i),
    ).toBeInTheDocument();
  });

  it('shows party badge from props even in fallback state', () => {
    render(<RepHeader {...defaultProps} />);
    expect(screen.getAllByText('Republican').length).toBeGreaterThan(0);
  });
});

describe('RepHeader — populated from sessionStorage', () => {
  it('shows representative name when sessionStorage is populated', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    expect(screen.getByRole('heading', { name: /aaron bean/i })).toBeInTheDocument();
  });

  it('hides fallback notice when sessionStorage is populated', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    expect(
      screen.queryByText(/visit from the main page/i),
    ).not.toBeInTheDocument();
  });

  it('renders photo img when photoUrl is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const img = screen.getByRole('img', { name: /aaron bean/i });
    expect(img).toHaveAttribute('src', mockRep.photoUrl);
  });

  it('shows initials avatar when photo fails to load (onError)', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });

    const img = screen.getByRole('img', { name: /aaron bean/i });
    // Simulate broken image
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    // Photo should be gone, initials should appear
    expect(screen.queryByRole('img', { name: /aaron bean/i })).not.toBeInTheDocument();
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders phone link when phone is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const phoneLink = screen.getByRole('link', { name: /202-225-0123/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:202-225-0123');
  });

  it('renders website link when url is present', async () => {
    sessionStorage.setItem('cyr_viewing_rep', JSON.stringify(mockRep));
    await act(async () => {
      render(<RepHeader {...defaultProps} />);
    });
    const websiteLink = screen.getByRole('link', { name: /contact via website/i });
    expect(websiteLink).toHaveAttribute('href', mockRep.url);
  });
});
