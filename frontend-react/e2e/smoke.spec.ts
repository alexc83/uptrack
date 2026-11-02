import { test, expect } from '@playwright/test';

test.describe('Standalone React landing smoke E2E', () => {
  test('starts without backend and renders landing view with styled Flowbite button', async ({ page }) => {
    await page.goto('/');

    // Verify document title (fixes F8)
    await expect(page).toHaveTitle('UpTrack — Credential & CE Tracking');

    // Verify root heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Track credentials. Stay compliant. Own your career.');

    // Verify Flowbite button is rendered and styled
    const button = page.getByRole('button', { name: 'Sign Up' });
    await expect(button).toBeVisible();

    // Verify computed style confirms Tailwind/Flowbite styling is active
    const buttonBg = await button.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(buttonBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonBg).not.toBe('transparent');

    // Capture visual proof of rendered landing page and styles
    await page.screenshot({ path: 'e2e/screenshots/landing-smoke.png' });
  });

  test('theme initialization applies dark mode class when stored', async ({ page }) => {
    // Pre-seed dark theme in localStorage before page loads
    await page.addInitScript(() => {
      localStorage.setItem('uptrack-theme', 'dark');
    });

    await page.goto('/');

    // Verify html element has dark class before interaction (fixes F1)
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('router wildcard redirects unknown path back to root', async ({ page }) => {
    await page.goto('/unknown-smoke-path');
    await expect(page).toHaveURL(/.*\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Track credentials. Stay compliant. Own your career.');
  });
});
