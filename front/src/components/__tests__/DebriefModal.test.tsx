import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DebriefModal } from '../DebriefModal';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/auth', () => ({
  authenticatedFetch: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ debriefs: [] }),
    })
  ),
}));

describe('DebriefModal Component', () => {
  it('opens history modal when "Voir l\'historique" is clicked, and can return back to form', async () => {
    const mockOnClose = vi.fn();
    const cvData = { target_company: 'TestCompany', target_job: 'TestJob' };

    render(<DebriefModal onClose={mockOnClose} cvData={cvData} />);

    // Check that we see the main form header
    expect(screen.getByText("Débrief d'Entretien")).toBeInTheDocument();

    // Click "Voir l'historique"
    const historyBtn = screen.getByRole('button', { name: /Voir l'historique/i });
    fireEvent.click(historyBtn);

    // Verify onClose was NOT called (our bug fix!)
    expect(mockOnClose).not.toHaveBeenCalled();

    // Verify that the history modal is now displayed
    await waitFor(() => {
      expect(screen.getByText("Historique des Débriefs")).toBeInTheDocument();
    });

    // Close the history modal using its aria-label
    const closeHistoryBtn = screen.getByRole('button', { name: /Fermer l'historique/i });
    fireEvent.click(closeHistoryBtn);

    // Verify that we are back to the main form
    await waitFor(() => {
      expect(screen.getByText("Débrief d'Entretien")).toBeInTheDocument();
    });
    
    // Verify onClose was still NOT called
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
