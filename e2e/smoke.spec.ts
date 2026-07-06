import { test, expect } from '@playwright/test';

// Each Playwright test gets a fresh browser context with empty storage, so the
// app always starts in its first-run state (no IndexedDB data yet). This is what
// makes the smoke flow deterministic across all three engines.

test('first-run onboarding completes and lands on home', async ({ page }) => {
  // With no data, the home route redirects to onboarding.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Lumen' })).toBeVisible();

  // Intro -> setup.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: "Let's set things up" })).toBeVisible();

  // Default goal is "Track my cycle"; set a last-period date, then complete. This
  // writes a cycle to IndexedDB and returns to home — exercising the local-first
  // storage path on each engine.
  await page.getByLabel('last period start').fill('2026-06-20');
  await page.getByRole('button', { name: 'Get started' }).click();

  await expect(page.getByRole('link', { name: 'Log today', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
});

test('log page renders its sections and controls', async ({ page }) => {
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: 'Log for today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flow' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'medium', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('calendar page renders a month grid', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
});

test('settings page renders its sections', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Passcode lock' })).toBeVisible();
});

test('library article opens from the list and renders its content', async ({ page }) => {
  await page.goto('/library');
  // "How period tracking works" is a universal article, so it's always listed
  // regardless of life stage; it may appear in both "For you" and "Browse".
  await page.getByRole('link', { name: /How period tracking works/ }).first().click();

  await expect(page).toHaveURL(/\/library\/how-tracking-works$/);
  await expect(
    page.getByRole('heading', { name: 'How period tracking works', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();

  // Back link returns to the library list.
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
});

test('home has no uncaught page errors after onboarding', async ({ page }) => {
  const errors: string[] = [];
  // Ignore WebKit's benign reports of cancelled RSC prefetches (see ttc-flow).
  page.on('pageerror', (err) => {
    if (!err.message.includes('_rsc=')) errors.push(err.message);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('last period start').fill('2026-06-20');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('link', { name: 'Log today', exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});
