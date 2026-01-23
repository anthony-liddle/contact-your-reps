import { render, screen } from '@testing-library/react';
import TrustBadges from '@/components/TrustBadges';

describe('TrustBadges', () => {
  it('renders all three trust badges', () => {
    render(<TrustBadges />);

    expect(screen.getByText('We do not send messages on your behalf')).toBeInTheDocument();
    expect(screen.getByText('We do not store your data')).toBeInTheDocument();
    expect(screen.getByText('No tracking or cookies')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<TrustBadges />);

    const region = screen.getByRole('region', { name: /privacy and trust information/i });
    expect(region).toBeInTheDocument();
  });
});
