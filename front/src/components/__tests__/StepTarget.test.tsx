import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StepTarget } from '../CandidateSteps';

const authenticatedFetchMock = vi.fn();
const changeLanguageMock = vi.fn();

vi.mock('../../utils/auth', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetchMock(...args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      resolvedLanguage: 'fr',
      changeLanguage: changeLanguageMock,
    },
  }),
}));

vi.mock('../InterviewContextForm', () => ({
  InterviewContextForm: () => <div data-testid="interview-context-form" />,
}));

describe('StepTarget job URL import', () => {
  beforeEach(() => {
    authenticatedFetchMock.mockReset();
    changeLanguageMock.mockReset();
  });

  it('imports a job offer preview and applies it to the target form', async () => {
    authenticatedFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'extracted',
        source_url: 'https://jobs.example.com/posting',
        source: 'json_ld',
        title: 'Responsable cybersécurité',
        company: 'Thales',
        location: 'Vélizy-Villacoublay',
        industry: 'Aéronautique & Défense',
        employment_type: 'CDI',
        date_posted: '2026-07-31',
        description: 'Piloter la cybersécurité du programme, coordonner les équipes et sécuriser les audits.',
        content_hash: 'abc123',
        word_count: 87,
        confidence: 0.94,
        warnings: [],
        is_cached: true,
      }),
    });

    const onChange = vi.fn();

    render(
      <StepTarget
        data={{
          target_job: '',
          target_role_primary: '',
          target_company: '',
          target_industry: '',
          job_description: '',
          target_language: 'fr',
          remote_preference: '',
        }}
        onChange={onChange}
        loading={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('https://careers.example.com/job/...'), {
      target: { value: 'https://jobs.example.com/posting' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Importer l’annonce/i }));

    await waitFor(() => {
      expect(screen.getByText('Offre détectée')).toBeInTheDocument();
      expect(screen.getByText('Responsable cybersécurité')).toBeInTheDocument();
      expect(screen.getByText(/Import déjà connu/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Utiliser cette annonce/i }));

    expect(onChange).toHaveBeenCalledWith('target_job', 'Responsable cybersécurité');
    expect(onChange).toHaveBeenCalledWith('target_role_primary', 'Responsable cybersécurité');
    expect(onChange).toHaveBeenCalledWith('target_company', 'Thales');
    expect(onChange).toHaveBeenCalledWith('target_industry', 'Aéronautique & Défense');
    expect(onChange).toHaveBeenCalledWith(
      'job_description',
      'Piloter la cybersécurité du programme, coordonner les équipes et sécuriser les audits.'
    );
    expect(onChange).toHaveBeenCalledWith('job_posting_url', 'https://jobs.example.com/posting');
  });
});
