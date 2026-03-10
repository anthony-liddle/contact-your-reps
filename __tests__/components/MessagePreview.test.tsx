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
    const textarea = screen.getByLabelText('Message:') as HTMLTextAreaElement;
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
    const textarea = screen.getByLabelText('Message:') as HTMLTextAreaElement;
    expect(textarea.value).toBe('My custom edit');
  });

  it('calls onBodyChange when user types in the textarea', async () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const textarea = screen.getByLabelText('Message:');
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
    expect(screen.getByText(/filter out form letters/i)).toBeInTheDocument();
  });

  it('subject field is read-only', () => {
    render(
      <MessagePreview message={mockMessage} editedBody={null} onBodyChange={mockOnBodyChange} />
    );
    const input = screen.getByLabelText(/subject/i) as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
  });
});
