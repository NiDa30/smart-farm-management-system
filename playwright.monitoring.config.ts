import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tools/tests',testMatch:'monitoring.browser.spec.ts',workers:1,retries:0,timeout:20000,
 outputDir:'coverage/monitoring-browser/artifacts',reporter:[['list'],['json',{outputFile:'coverage/monitoring-browser/results.json'}]],
 use:{baseURL:'http://127.0.0.1:4179',browserName:'chromium',serviceWorkers:'block',trace:'retain-on-failure',launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},
 webServer:{command:'node tools/tests/monitoring-fixture-server.mjs',url:'http://127.0.0.1:4179',reuseExistingServer:false,timeout:30000}});
