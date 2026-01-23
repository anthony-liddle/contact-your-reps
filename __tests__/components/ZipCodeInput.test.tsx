import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZipCodeInput from '@/components/ZipCodeInput';

describe('ZipCodeInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders input and button', () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find.*representatives/i })).toBeInTheDocument();
  });

  it('calls onSubmit with valid ZIP code', async () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByLabelText(/zip code/i);
    const button = screen.getByRole('button', { name: /find.*representatives/i });

    await userEvent.type(input, '12345');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('12345');
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} error="Test error message" />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows validation error for invalid ZIP code', async () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByLabelText(/zip code/i);
    const button = screen.getByRole('button', { name: /find.*representatives/i });

    await userEvent.type(input, '123');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/valid 5-digit/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when empty', async () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} />);

    const button = screen.getByRole('button', { name: /find.*representatives/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/please enter your zip code/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('strips non-numeric characters except dashes', async () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByLabelText(/zip code/i) as HTMLInputElement;
    await userEvent.type(input, '12a3b4c5');

    expect(input.value).toBe('12345');
  });

  it('disables input when loading', () => {
    render(<ZipCodeInput onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByLabelText(/zip code/i)).toBeDisabled();
  });
});
