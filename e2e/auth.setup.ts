import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/student.json';

setup('authenticate as student', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="studentId"]', '20280101');
  await page.fill('input[name="password"]', 'test-password');
  await page.click('button[type="submit"]');

  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
