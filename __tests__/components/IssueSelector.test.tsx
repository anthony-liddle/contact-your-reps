import { render, screen, fireEvent } from '@testing-library/react';
import IssueSelector from '@/components/IssueSelector';
import type { Issue } from '@/data/issues';

const mockIssues: Issue[] = [
  {
    id: 'issue-1',
    title: 'Test Issue One',
    description: 'First test issue description',
    messageParagraph: 'First paragraph.',
  },
  {
    id: 'issue-2',
    title: 'Test Issue Two',
    description: 'Second test issue description',
    messageParagraph: 'Second paragraph.',
  },
];

describe('IssueSelector', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it('renders all issues', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('Test Issue One')).toBeInTheDocument();
    expect(screen.getByText('Test Issue Two')).toBeInTheDocument();
  });

  it('shows issue descriptions', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('First test issue description')).toBeInTheDocument();
    expect(screen.getByText('Second test issue description')).toBeInTheDocument();
  });

  it('calls onSelectionChange when checkbox is clicked', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('shows checked state for selected issues', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set(['issue-1'])}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('displays selection count', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set(['issue-1'])}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('(1 of 2 selected)')).toBeInTheDocument();
  });

  it('has a Select All button', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
  });

  it('calls onSelectionChange with all issues when Select All is clicked', () => {
    render(
      <IssueSelector
        issues={mockIssues}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllButton = screen.getByRole('button', { name: /select all/i });
    fireEvent.click(selectAllButton);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set(['issue-1', 'issue-2']));
  });
});
