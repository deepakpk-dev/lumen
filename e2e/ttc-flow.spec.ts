import { test, expect } from '@playwright/test';

// End-to-end TTC ("Trying to conceive") user journey in one browser context:
// onboarding with the TTC goal, landing on the fertility space, the TTC-aware
// home screen, logging ovulation signals, and guidance reacting to them.

// A last period 16 days ago keeps the flow deterministic on any calendar date:
// day 17 is past the predicted fertile window, so guidance starts "low" and
// must flip once a positive LH test is logged.
const lastPeriod = new Date(Date.now() - 16 * 86400e3).toISOString().slice(0, 10);

test('TTC journey: onboard, log signals, see fertility guidance react', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Onboarding: pick the TTC goal.
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /Trying to conceive/ }).click();
  await page.getByLabel('last period start').fill(lastPeriod);
  await page.getByRole('button', { name: 'Get started' }).click();

  // TTC onboarding lands directly on the fertility space.
  await page.waitForURL('**/fertility');
  await expect(page.getByRole('heading', { name: 'Fertility' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'BBT chart' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ovulation status' })).toBeVisible();

  // Home is TTC-aware: fertility nav link + conception guidance card.
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('link', { name: 'Fertility' })).toBeVisible();
  await expect(
    page.getByText('Lumen is not a contraceptive', { exact: false }).first(),
  ).toBeVisible();

  // The fertility landing must offer a path to logging (BBT entry lives on
  // the daily log — without this link the page is a dead end).
  await page.getByRole('link', { name: 'Fertility' }).click();
  await page.getByRole('link', { name: 'Log today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ovulation test (LH)' })).toBeVisible();
  await page.getByLabel(/Basal body temperature/).fill('36.6');
  await page.getByRole('button', { name: 'positive', exact: true }).click();
  await page.getByRole('button', { name: 'egg-white', exact: true }).click();
  await page.getByLabel('Intercourse').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved to your log.')).toBeVisible();

  // Fertility page: signals produce an ovulation estimate and high guidance.
  await page.goto('/fertility');
  await expect(page.getByText(/Ovulation estimated around/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'High chance to conceive' })).toBeVisible();

  // Saved log round-trips from IndexedDB.
  await page.goto('/log');
  await expect(page.getByLabel(/Basal body temperature/)).toHaveValue('36.6');

  expect(errors).toEqual([]);
});
