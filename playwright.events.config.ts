import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tools/tests',testMatch:'events.browser.spec.ts',workers:1,retries:0,timeout:20000,
  outputDir:'coverage/events-browser/artifacts',
  reporter:[['list'],['json',{outputFile:'coverage/events-browser/results.json'}]],
  use:{baseURL:'http://127.0.0.1:4178',browserName:'chromium',serviceWorkers:'block',trace:'retain-on-failure',
    launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},
  webServer:{command:'node tools/tests/events-fixture-server.mjs',url:'http://127.0.0.1:4178',reuseExistingServer:false,timeout:30000}
});
