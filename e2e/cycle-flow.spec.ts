import { test, expect } from '@playwright/test';

// End-to-end cycle-tracking user journey in one browser context: onboarding
// with the default cycle goal, the predicting home screen, the period arriving
// and being logged (which rolls the cycle over), the calendar's full marker
// set, and history reflecting the completed cycle.

// A last period 27 days ago puts the user on day 28 of a default 28-day
// cycle: the period is predicted imminently, and logging flow today starts a
// new cycle — the core tracking loop — deterministic on any calendar date.
const lastPeriod = new Date(Date.now() - 27 * 86400e3).toISOString().slice(0, 10);

test('cycle journey: onboard, prediction, period arrives, cycle rolls over', async ({ page }) => {
  const errors: string[] = [];
  // Ignore WebKit's benign reports of cancelled RSC prefetches (see ttc-flow).
  page.on('pageerror', (err) => {
    if (!err.message.includes('_rsc=')) errors.push(err.message);
  });

  // Onboarding: the default goal is already "Track my cycle".
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('last period start').fill(lastPeriod);
  await page.getByRole('button', { name: 'Get started' }).click();

  // Home predicts from the seeded cycle: day 28, period due, honest confidence.
  await expect(page.getByText('Day 28')).toBeVisible();
  await expect(page.getByText(/Next period in ~1 day|Next period today/)).toBeVisible();
  await expect(page.getByText(/Confidence: (low|medium|high)/)).toBeVisible();

  // Calendar shows the full cycle-mode legend, including fertile markers.
  await page.goto('/calendar');
  await expect(page.getByText('fertile window')).toBeVisible();

  // The period arrives: log flow today. Saving a period flow rolls the cycle
  // over automatically — no separate "period started" step.
  await page.goto('/log');
  await page.getByRole('button', { name: 'medium', exact: true }).click();
  await page.getByRole('button', { name: 'Cramps' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved to your log.')).toBeVisible();

  // Home flips to day 1 of the new cycle.
  await page.goto('/');
  await expect(page.getByText('Menstrual phase', { exact: true })).toBeVisible();
  await expect(page.getByText('Day 1', { exact: true })).toBeVisible();

  // History records the completed 27-day cycle alongside the current one.
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History & trends' })).toBeVisible();
  await expect(page.getByText('27 day cycle')).toBeVisible();
  await expect(page.getByText('Current cycle')).toBeVisible();

  // The log round-trips from IndexedDB.
  await page.goto('/log');
  await expect(page.getByRole('button', { name: 'Cramps' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  expect(errors).toEqual([]);
});
