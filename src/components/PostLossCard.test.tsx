import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostLossCard } from './PostLossCard';

describe('PostLossCard', () => {
  it('shows gentle copy with no period or prediction prompts', () => {
    render(<PostLossCard />);
    expect(screen.getByText(/take all the time you need/i)).toBeTruthy();
    expect(screen.queryByText(/log your first period/i)).toBeNull();
    expect(screen.queryByText(/predictions/i)).toBeNull();
    expect(screen.queryByText(/last period/i)).toBeNull();
  });
});
