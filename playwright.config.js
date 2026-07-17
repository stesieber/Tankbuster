const { defineConfig } = require('@playwright/test');
const fs = require('fs');

const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = fs.existsSync(LOCAL_CHROME) ? { executablePath: LOCAL_CHROME } : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions,
  },
  webServer: {
    command: 'python3 -m http.server 7777',
    url: 'http://localhost:7777',
    reuseExistingServer: false,
    timeout: 5000,
  },
});
