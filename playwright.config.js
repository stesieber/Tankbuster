const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Vorinstalliertes Chromium mit Proxy-CA-Trust verwenden
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
  webServer: {
    command: 'python3 -m http.server 7777',
    url: 'http://localhost:7777',
    reuseExistingServer: false,
    timeout: 5000,
  },
});
