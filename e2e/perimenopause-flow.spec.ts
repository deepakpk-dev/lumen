import { test, expect } from '@playwright/test';

// End-to-end perimenopause user journey in one browser context: onboarding
// with the perimenopause goal, the reframed home screen, logging stage-specific
// symptoms, the calendar with fertile/ovulation markers suppressed, and the
// Settings toggle returning to standard cycle tracking.

const lastPeriod = new Date(Date.now() - 16 * 86400e3).toISOString().slice(0, 10);

test('Perimenopause journey: onboard, log symptoms, no fertile window, toggle off', async ({
  page,
}) => {
  const errors: string[] = [];
  // WebKit reports Next.js's cancelled RSC prefetches as page errors; they're
  // benign engine noise, not app failures (see ttc-flow.spec.ts).
  page.on('pageerror', (err) => {
    if (!err.message.includes('_rsc=')) errors.push(err.message);
  });

  // Onboarding: pick the perimenopause goal.
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /Navigating perimenopause/ }).click();
  await page.getByLabel('last period start').fill(lastPeriod);
  await page.getByRole('button', { name: 'Get started' }).click();

  // Lands on home, reframed for the transition: the uncertainty note is shown.
  await expect(
    page.getByText('Cycles often become irregular in perimenopause', { exact: false }),
  ).toBeVisible();

  // Log screen swaps in perimenopause symptoms and hides TTC-only fields.
  await page.goto('/log');
  await expect(page.getByRole('button', { name: 'Hot flashes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ovulation test (LH)' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Hot flashes' }).click();
  await page.getByRole('button', { name: 'Night sweats' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved to your log.')).toBeVisible();

  // Saved symptoms round-trip from IndexedDB.
  await page.goto('/log');
  await expect(page.getByRole('button', { name: 'Hot flashes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Calendar: fertile/ovulation markers are deliberately suppressed.
  await page.goto('/calendar');
  await expect(page.getByText('period', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('fertile window')).toHaveCount(0);

  // Settings reports the mode as on; turning it off returns to standard
  // cycle tracking (home note gone, fertile legend back).
  await page.goto('/settings');
  await expect(page.getByText('Perimenopause mode is on', { exact: false })).toBeVisible();
  // The fertile-window reminder never fires in this mode, so its toggle is hidden.
  await expect(page.getByText('Fertile window & ovulation')).toHaveCount(0);
  await page.getByRole('button', { name: 'Turn off perimenopause mode' }).click();
  await expect(page.getByText('Perimenopause mode is off', { exact: false })).toBeVisible();
  await expect(page.getByText('Fertile window & ovulation')).toBeVisible();
  await page.goto('/');
  await expect(
    page.getByText('Cycles often become irregular in perimenopause', { exact: false }),
  ).toHaveCount(0);
  await page.goto('/calendar');
  await expect(page.getByText('fertile window')).toBeVisible();

  expect(errors).toEqual([]);
});
