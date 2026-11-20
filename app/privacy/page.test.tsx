import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('states the core privacy guarantees', () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/stored on this device/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/encrypts your records on this device before uploading/i)).toBeInTheDocument();
    expect(screen.getByText(/without an account or email address/i)).toBeInTheDocument();
    expect(screen.getAllByText(/export/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a substitute for professional medical care/i)).toBeInTheDocument();
  });
});
