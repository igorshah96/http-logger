import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '*.spec.ts',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4443',
    viewport: { width: 1920, height: 1080 },
    headless: true,
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
