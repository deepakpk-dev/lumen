import { test, expect } from '@playwright/test';

// End-to-end pregnancy user journey in one browser context: onboarding as
// pregnant via the last-period path (due date derived), the week-by-week hub,
// kick counting, contraction timing, pregnancy-specific logging, editing the
// due date, and the pregnancy-loss exit — the compassionate path that must
// never celebrate or enter postpartum. (The "Baby arrived" exit is covered by
// postpartum-flow.spec.ts.)

// A last period 56 days ago pins the journey to week 8, trimester 1, with a
// derived due date 224 days out — deterministic on any calendar date.
const lastPeriod = new Date(Date.now() - 56 * 86400e3).toISOString().slice(0, 10);

test('pregnancy journey: onboard via LMP, hub, kicks, contractions, log, loss exit', async ({
  page,
}) => {
  const errors: string[] = [];
  // Ignore WebKit's benign reports of cancelled RSC prefetches (see ttc-flow).
  page.on('pageerror', (err) => {
    if (!err.message.includes('_rsc=')) errors.push(err.message);
  });

  // Onboarding: pregnant, but unsure of the due date — enter the last period
  // instead and let Lumen derive it (Naegele's rule).
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /I'm pregnant/ }).click();
  await page.getByRole('button', { name: /Enter your last period instead/ }).click();
  await page.getByLabel('last period start').fill(lastPeriod);
  await expect(page.getByText('Estimated due date:')).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();

  // Lands on the week-by-week pregnancy hub with stage-true framing.
  await page.waitForURL('**/pregnancy');
  await expect(page.getByRole('heading', { name: 'Pregnancy' })).toBeVisible();
  await expect(page.getByText('Trimester 1 · 224 days to go')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Baby this week' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your body this week' })).toBeVisible();

  // Kick counter: a session round-trips into the recent-sessions list.
  await page.getByRole('link', { name: 'Kick counter' }).click();
  await page.getByRole('button', { name: 'Start a session' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Record a kick' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText(/: 3 kicks/)).toBeVisible();

  // Contraction timer: one timed contraction, saved to recent sessions.
  await page.getByRole('link', { name: 'Pregnancy', exact: true }).click();
  await page.getByRole('link', { name: 'Contraction timer' }).click();
  await page.getByRole('button', { name: 'Start contraction' }).click();
  await page.getByRole('button', { name: 'Stop contraction' }).click();
  await expect(page.getByText('1 contraction logged')).toBeVisible();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText(/: 1 contraction/)).toBeVisible();

  // Log screen speaks pregnancy: Braxton Hicks in, saved symptoms persist.
  await page.goto('/log');
  await page.getByRole('button', { name: 'Braxton Hicks' }).click();
  await page.getByRole('button', { name: 'Heartburn' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved to your log.')).toBeVisible();
  await page.goto('/log');
  await expect(page.getByRole('button', { name: 'Braxton Hicks' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Home is pregnancy-aware: the week card and the Pregnancy nav tile, and
  // the daily read never jumps ahead of the user's trimester.
  await page.goto('/');
  await expect(page.getByText('Trimester 1 · 224 days to go')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pregnancy', exact: true })).toBeVisible();
  await expect(page.getByText(/second trimester|third trimester/i)).toHaveCount(0);

  // Settings: the due date can be corrected after a scan.
  const newDue = new Date(Date.now() + 230 * 86400e3).toISOString().slice(0, 10);
  await page.goto('/settings');
  await expect(page.getByText('Pregnancy mode is on', { exact: false })).toBeVisible();
  await page.getByLabel('edit due date').fill(newDue);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Due date: ${newDue}`, { exact: false })).toBeVisible();

  // Pregnancy loss: the exit is compassionate — no congratulations, no
  // postpartum mode — and home stops prompting about periods.
  await page.getByRole('button', { name: 'Manage pregnancy' }).click();
  await page.getByRole('button', { name: 'My pregnancy has ended' }).click();
  await expect(page.getByText(/so sorry for your loss/)).toBeVisible();
  await expect(page.getByText('Congratulations', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to cycle mode' }).click();
  await page.waitForURL('**/');
  await expect(page.getByText('Take all the time you need', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Postpartum/ })).toHaveCount(0);
  // No daily read next to the loss card — cycle content waits until the user
  // chooses to track again.
  await expect(page.getByText("Today's read")).toHaveCount(0);

  expect(errors).toEqual([]);
});
