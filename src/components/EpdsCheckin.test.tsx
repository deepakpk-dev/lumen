// src/components/EpdsCheckin.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EpdsCheckin } from './EpdsCheckin';
import { EPDS_QUESTIONS } from '@/src/domain/postpartum/epds';

const saveEpdsCheckin = vi.fn();
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveEpdsCheckin }),
}));

beforeEach(() => saveEpdsCheckin.mockReset());

/**
 * Answer all 10 questions by picking the radio at the given option index for each question.
 * Relies on options rendering in declared order (index 0 = first declared option, etc.).
 */
function answerAllByIndex(optionIndex: number) {
  const groups = screen.getAllByRole('radiogroup');
  for (const g of groups) {
    const radios = within(g).getAllByRole('radio');
    fireEvent.click(radios[optionIndex]);
  }
}

/**
 * Answer all 10 questions by clicking the option with value=0 (best/no-symptom answer).
 * For reverse-scored items this is the last option; for forward-scored items it's the first.
 * We use EPDS_QUESTIONS directly to find the zero-value option by label.
 */
function answerAllBest() {
  const groups = screen.getAllByRole('radiogroup');
  groups.forEach((g, qi) => {
    const question = EPDS_QUESTIONS[qi];
    const zeroOption = question.options.find((o) => o.value === 0)!;
    const radio = within(g).getByRole('radio', { name: zeroOption.label });
    fireEvent.click(radio);
  });
}

/**
 * Answer all questions best (value=0) EXCEPT question index `exceptQi`, which gets
 * the option with the specified value.
 */
function answerAllBestExcept(exceptQi: number, exceptValue: number) {
  const groups = screen.getAllByRole('radiogroup');
  groups.forEach((g, qi) => {
    const question = EPDS_QUESTIONS[qi];
    if (qi === exceptQi) {
      const targetOption = question.options.find((o) => o.value === exceptValue)!;
      const radio = within(g).getByRole('radio', { name: targetOption.label });
      fireEvent.click(radio);
    } else {
      const zeroOption = question.options.find((o) => o.value === 0)!;
      const radio = within(g).getByRole('radio', { name: zeroOption.label });
      fireEvent.click(radio);
    }
  });
}

describe('EpdsCheckin', () => {
  it('keeps submit disabled until all questions are answered', () => {
    render(<EpdsCheckin />);
    expect(screen.getByRole('button', { name: /see my result/i })).toBeDisabled();
  });

  it('enables submit only after all 10 questions are answered', () => {
    render(<EpdsCheckin />);
    const button = screen.getByRole('button', { name: /see my result/i });
    expect(button).toBeDisabled();
    answerAllBest();
    expect(button).not.toBeDisabled();
  });

  it('does NOT show the crisis block when all answers are value 0 (total 0, no self-harm)', () => {
    render(<EpdsCheckin />);
    answerAllBest();
    fireEvent.click(screen.getByRole('button', { name: /see my result/i }));
    expect(saveEpdsCheckin).toHaveBeenCalled();
    // Crisis block should not appear
    expect(screen.queryByText(/support is available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/crisis/i)).not.toBeInTheDocument();
    // Non-diagnostic copy must appear (at least one element)
    expect(screen.getAllByText(/screening tool, not a diagnosis/i).length).toBeGreaterThan(0);
    // Provider advice
    expect(screen.getAllByText(/healthcare provider/i).length).toBeGreaterThan(0);
  });

  it('shows the crisis block when the self-harm item (q10, index 9) is non-zero', () => {
    render(<EpdsCheckin />);
    // Answer q10 (index 9) with value=3 ("Yes, quite often") — the FIRST option for that question
    // All other questions answered with value=0
    answerAllBestExcept(9, 3);

    fireEvent.click(screen.getByRole('button', { name: /see my result/i }));
    expect(saveEpdsCheckin).toHaveBeenCalled();

    // Verify saveEpdsCheckin was called with responses[9] > 0
    const responses = saveEpdsCheckin.mock.calls[0][0] as number[];
    expect(responses[9]).toBeGreaterThan(0);

    // Crisis/support block must appear
    expect(screen.getByText(/support is available/i)).toBeInTheDocument();
  });

  it('shows the crisis block when total score is >= 13 (probable band)', () => {
    render(<EpdsCheckin />);
    // Answer all questions with value=3 to produce max score (30)
    // For reverse-scored items (q1, q2, q4), value=3 is last option; for others it's first
    const groups = screen.getAllByRole('radiogroup');
    groups.forEach((g, qi) => {
      const question = EPDS_QUESTIONS[qi];
      const highOption = question.options.find((o) => o.value === 3)!;
      const radio = within(g).getByRole('radio', { name: highOption.label });
      fireEvent.click(radio);
    });

    fireEvent.click(screen.getByRole('button', { name: /see my result/i }));
    expect(saveEpdsCheckin).toHaveBeenCalled();
    expect(screen.getByText(/support is available/i)).toBeInTheDocument();
  });

  it('shows score, band text, and non-diagnostic copy in the result', () => {
    render(<EpdsCheckin />);
    answerAllBest();
    fireEvent.click(screen.getByRole('button', { name: /see my result/i }));
    // Score shown
    expect(screen.getByText(/0\s*\/\s*30|score.*0/i)).toBeInTheDocument();
    // Non-diagnostic disclaimer (at least one element — bandText may also contain this phrase)
    expect(screen.getAllByText(/screening tool, not a diagnosis/i).length).toBeGreaterThan(0);
    // Provider instructions (at least one element)
    expect(screen.getAllByText(/healthcare provider/i).length).toBeGreaterThan(0);
  });

  it('renders all 10 question prompts', () => {
    render(<EpdsCheckin />);
    for (const q of EPDS_QUESTIONS) {
      expect(screen.getByText(q.prompt)).toBeInTheDocument();
    }
  });

  it('renders a non-diagnostic intro before the questions', () => {
    render(<EpdsCheckin />);
    expect(screen.getByText(/screening tool, not a diagnosis/i)).toBeInTheDocument();
  });
});
