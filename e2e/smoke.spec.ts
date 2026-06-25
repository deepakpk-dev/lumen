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
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();

  // Default goal is "Track my cycle" with today's date prefilled. Completing the
  // form writes a cycle to IndexedDB and returns to home — this exercises the
  // local-first storage path on each engine.
  await page.getByRole('button', { name: 'Get started' }).click();

  await expect(page.getByRole('link', { name: 'Log today' })).toBeVisible();
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

test('home has no uncaught page errors after onboarding', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('link', { name: 'Log today' })).toBeVisible();

  expect(errors).toEqual([]);
});
