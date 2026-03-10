import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmTemplateModal from '@/components/ConfirmTemplateModal';

describe('ConfirmTemplateModal', () => {
  const mockOnUpdate = jest.fn();
  const mockOnKeep = jest.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnKeep.mockClear();
    // jsdom doesn't implement dialog — mock showModal/close and simulate the open attribute
    // so elements inside become accessible to testing-library queries.
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
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
