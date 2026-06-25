import { defineConfig, devices } from '@playwright/test';

// Cross-browser smoke suite. Runs the same flows on the three engines that
// matter for a web-first PWA: Chromium (Chrome/Edge), Firefox (Gecko), and
// WebKit (Safari / iOS Safari). This is the repeatable counterpart to manual
// cross-browser checks — see e2e/smoke.spec.ts.

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Run engines in parallel; keep tests within a file ordered for readability.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Generous timeouts so the dev server's on-demand route compilation (first hit
  // to each page) doesn't cause flakes. Lower these if you point at a prod build.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Reuses the dev server you already have running locally; starts one in CI.
  // To smoke a production build instead, run `npm run build` first and set
  // PW_WEB_COMMAND="npm run start".
  webServer: {
    command: process.env.PW_WEB_COMMAND ?? 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
