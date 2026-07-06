import { test, expect } from '@playwright/test';

// End-to-end postpartum user journey in one browser context: onboarding as
// pregnant, ending the pregnancy with "Baby arrived", landing in postpartum
// mode, taking the EPDS mood check-in, logging recovery (lochia, not period
// flow), and finally leaving postpartum from Settings.

// A due date a month out keeps the flow deterministic on any calendar date;
// the birth is confirmed "today", so the recovery card always reads week 1.
const dueDate = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

test('postpartum journey: birth, recovery home, mood check-in, log, exit', async ({ page }) => {
  const errors: string[] = [];
  // Ignore WebKit's benign reports of cancelled RSC prefetches (see ttc-flow).
  page.on('pageerror', (err) => {
    if (!err.message.includes('_rsc=')) errors.push(err.message);
  });

  // Onboarding: pick the pregnancy goal and enter a due date.
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /I'm pregnant/ }).click();
  await page.getByLabel('due date', { exact: true }).fill(dueDate);
  await page.getByRole('button', { name: 'Get started' }).click();

  // Pregnant onboarding lands on the week-by-week pregnancy space.
  await page.waitForURL('**/pregnancy');
  await expect(page.getByRole('heading', { name: 'Pregnancy' })).toBeVisible();

  // Baby arrives: the end-of-pregnancy flow lives in Settings.
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Manage pregnancy' }).click();
  await page.getByRole('button', { name: 'Baby arrived' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Home is now postpartum-aware: week-1 recovery card + Postpartum nav tile.
  await expect(page.getByRole('heading', { name: 'Postpartum · week 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Postpartum', exact: true }).click();

  // The postpartum space: recovery guidance and paths onward.
  await page.waitForURL('**/postpartum');
  await expect(page.getByRole('heading', { name: 'Postpartum', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log recovery' })).toBeVisible();

  // Mood check-in: answer all ten EPDS questions with the 0-scored option so
  // the result is deterministic (low band, no risk escalation).
  await page.getByRole('link', { name: 'Mood check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Mood check-in' })).toBeVisible();
  for (let q = 0; q < 10; q++) {
    await page.locator(`input[name="epds-${q}"][value="0"]`).check();
  }
  await page.getByRole('button', { name: 'See my result' }).click();
  await expect(page.getByText('Score: 0 / 30')).toBeVisible();
  await expect(page.getByText('Support is available')).not.toBeVisible();

  // Recovery logging: the daily log speaks lochia, never period flow.
  await page.getByRole('link', { name: 'Postpartum' }).click();
  await page.getByRole('link', { name: 'Log recovery' }).click();
  await expect(page.getByRole('heading', { name: 'Lochia' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flow', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'medium', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved to your log.')).toBeVisible();

  // Home reflects the saved check-in (round-tripped from IndexedDB).
  await page.goto('/');
  await expect(page.getByText(/Last mood check-in:/)).toBeVisible();

  // Settings: postpartum management shows check-in history and an exit path.
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('0 / 30 (low)')).toBeVisible();

  // The breastfeeding flag tunes the cycle-return copy on the postpartum page
  // (educational only — never a prediction input).
  // The checkbox is controlled and flips only after the profile save round-trips
  // through IndexedDB, so click + await the state (plain check() races on WebKit).
  const breastfeedingBox = page.getByRole('checkbox', { name: 'I am breastfeeding' });
  await breastfeedingBox.click();
  await expect(breastfeedingBox).toBeChecked();
  await page.goto('/postpartum');
  await expect(page.getByText(/While you are breastfeeding/)).toBeVisible();
  await page.getByRole('link', { name: 'Manage postpartum' }).click();
  await page.getByRole('button', { name: 'End postpartum mode' }).click();
  await page.getByRole('button', { name: 'Back to cycle tracking' }).click();

  // Postpartum controls give way to the cycle-era sections again.
  await expect(page.getByRole('heading', { name: 'Trying to conceive' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'End postpartum mode' })).not.toBeVisible();

  expect(errors).toEqual([]);
});
