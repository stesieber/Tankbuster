const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }
      : undefined,
  },
  webServer: {
    command: 'python3 -m http.server 7777',
    url: 'http://localhost:7777',
    reuseExistingServer: false,
    timeout: 5000,
  },
});
