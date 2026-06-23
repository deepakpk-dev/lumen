import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('states the core privacy guarantees', () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/stored only on this device/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no accounts, no tracking, no analytics/i)).toBeInTheDocument();
    expect(screen.getAllByText(/export/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a substitute for professional medical care/i)).toBeInTheDocument();
  });
});
