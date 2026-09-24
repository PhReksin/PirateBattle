import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60_000, fullyParallel: true, workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173', locale: 'en-US', timezoneId: 'UTC',
    colorScheme: 'dark', serviceWorkers: 'allow', trace: 'retain-on-failure', screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run build -- --mode e2e && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120_000
  },
});