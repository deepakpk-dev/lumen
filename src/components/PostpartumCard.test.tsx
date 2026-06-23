import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostpartumCard } from './PostpartumCard';

describe('PostpartumCard', () => {
  it('shows the recovery week', () => {
    render(<PostpartumCard week={3} stage="acute" latestBand={null} />);
    expect(screen.getByText(/week 3/i)).toBeInTheDocument();
  });
  it('shows the latest EPDS band when present', () => {
    render(<PostpartumCard week={5} stage="acute" latestBand="possible" />);
    expect(screen.getByText(/check-in/i)).toBeInTheDocument();
  });
});
