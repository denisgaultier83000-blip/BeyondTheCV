import { render, screen } from '@testing-library/react';
import { ResearchReport } from '../ResearchReport';
import { describe, it, expect } from 'vitest';

const mockData = {
  brief: {
    overview: "Company overview text",
    culture: "Innovative culture",
    challenges: "Scaling challenges",
    advice: ["Be yourself", "Ask questions"]
  },
  key_points: ["Point 1", "Point 2"]
};

describe('ResearchReport Component', () => {
  it('renders company name and overview', () => {
    render(<ResearchReport data={mockData} companyName="TechCorp" />);
    expect(screen.getByText(/Rapport Stratégique : TechCorp/i)).toBeInTheDocument();
  });
});