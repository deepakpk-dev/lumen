import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BbtChart } from '@/src/components/BbtChart';

describe('BbtChart', () => {
  it('shows a placeholder with no points', () => {
    render(<BbtChart points={[]} unit="C" />);
    expect(screen.getByText(/log your temperature/i)).toBeTruthy();
  });

  it('renders one marker per point', () => {
    const { container } = render(
      <BbtChart
        points={[
          { date: '2026-06-01', value: 36.4 },
          { date: '2026-06-02', value: 36.5 },
          { date: '2026-06-03', value: 36.7 },
        ]}
        coverline={36.5}
        ovulationDate="2026-06-02"
        unit="C"
      />,
    );
    expect(container.querySelectorAll('circle').length).toBe(3);
    expect(container.querySelector('line')).not.toBeNull(); // coverline
  });
});
