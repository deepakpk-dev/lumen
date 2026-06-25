import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HealthDataProvider, useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';
import { clearPreferences } from '@/src/settings/preferences';

beforeEach(async () => {
  await deleteAll();
  clearPreferences();
});

function Mutator() {
  const { loading, startPregnancyMode } = useHealthData();
  return (
    <button disabled={loading} onClick={() => void startPregnancyMode({ dueDate: '2026-10-08' })}>
      start
    </button>
  );
}

function Reader() {
  const { isPregnant } = useHealthData();
  return <span data-testid="reader">{isPregnant ? 'PREG_ON' : 'PREG_OFF'}</span>;
}

describe('HealthDataProvider', () => {
  it('reflects a mutation from one consumer in a sibling consumer', async () => {
    render(
      <HealthDataProvider>
        <Mutator />
        <Reader />
      </HealthDataProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
    expect(screen.getByTestId('reader')).toHaveTextContent('PREG_OFF');

    fireEvent.click(screen.getByRole('button'));

    // The sibling Reader must see the update without a remount/reload.
    await waitFor(() => expect(screen.getByTestId('reader')).toHaveTextContent('PREG_ON'));
  });
});
