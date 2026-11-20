import type { Page } from '@playwright/test';

export async function openOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
}

export async function continueSetup(page: Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function finishSetupFromDate(page: Page, cycle = true) {
  await continueSetup(page);
  if (cycle) {
    await continueSetup(page);
    await continueSetup(page);
    await continueSetup(page);
  }
  await continueSetup(page);
  await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
}
