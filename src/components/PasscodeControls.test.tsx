import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasscodeControls } from './PasscodeControls';
import { hasPasscode } from '@/src/security/passcode';

beforeEach(() => {
  localStorage.clear();
});

describe('PasscodeControls', () => {
  it('setting a passcode results in hasPasscode() true and cleartext not in localStorage', async () => {
    render(<PasscodeControls />);

    // Wait for the ready gate to resolve
    const input = await screen.findByLabelText('new passcode');
    await userEvent.type(input, '1234');
    await userEvent.click(screen.getByRole('button', { name: /set passcode/i }));

    await waitFor(() => expect(hasPasscode()).toBe(true));
    expect(JSON.stringify(localStorage)).not.toContain('1234');
  });

  it('removing the passcode results in hasPasscode() false', async () => {
    // Pre-set a passcode so the "enabled" branch renders
    const { clearPasscode: cp, setPasscode: sp } = await import('@/src/security/passcode');
    await sp('5678');

    render(<PasscodeControls />);

    const removeBtn = await screen.findByRole('button', { name: /remove passcode/i });
    await userEvent.click(removeBtn);

    await waitFor(() => expect(hasPasscode()).toBe(false));
  });
});
