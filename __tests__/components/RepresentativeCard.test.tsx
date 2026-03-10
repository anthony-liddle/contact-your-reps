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

  it('does not show field office phone when none provided', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    // No field offices — there should be only the DC phone number link
    const phoneLinks = screen.getAllByRole('link');
    // Only the website link should be present (phone links use href="tel:")
    expect(phoneLinks.some((l) => l.getAttribute('href')?.startsWith('tel:503'))).toBe(false);
  });

  it('shows photo when photoUrl is provided', () => {
    const rep: Representative = { ...baseSenator, photoUrl: 'https://example.com/photo.jpg' };
    render(<RepresentativeCard representative={rep} />);
    expect(screen.getByAltText(/photo of senator jane smith/i)).toBeInTheDocument();
  });

  it('shows placeholder when no photoUrl', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.queryByAltText(/photo of/i)).not.toBeInTheDocument();
  });

  it('shows reason text', () => {
    render(<RepresentativeCard representative={baseSenator} />);
    expect(screen.getByText('This is one of your two senators.')).toBeInTheDocument();
  });
});
