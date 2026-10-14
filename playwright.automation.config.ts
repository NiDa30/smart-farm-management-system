import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tools/tests',
  testMatch: 'automation.browser.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 20_000,
  outputDir: 'coverage/automation-browser/artifacts',
  reporter: [['list'], ['json', { outputFile: 'coverage/automation-browser/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tools/tests/automation-fixture-server.mjs',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
