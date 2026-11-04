// TEMPORARY D01-B controlled CI failure probe. Disposable branch only; never merge.
import { test, expect } from '@playwright/test';

test('D01-B deliberate Chromium E2E failure for CI validation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('d01-b-ci-failure-probe-missing-element')).toBeVisible({ timeout: 2000 });
});
