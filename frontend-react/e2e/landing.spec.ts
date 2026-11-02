import { resolve } from 'node:path';
import type { Route } from '@playwright/test';
import { test, expect, allowApi, capture, e2eToken, e2eUser, evidenceDirectory, mockDashboard, noOverflow, setTheme, signIn } from './helpers';

const hero = 'Track credentials. Stay compliant. Own your career.';
const viewports = [375, 640, 768, 769, 920, 1080, 1280] as const;

test('hero and CTA actions are horizontally centered in their sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  for (const name of ['Get Started', 'Get Started for Free']) {
    const button = page.getByRole('button', { name, exact: true });
    const section = page.locator('section', { has: button });
    const buttonBox = await button.boundingBox();
    const sectionBox = await section.boundingBox();
    const buttonCenter = buttonBox!.x + buttonBox!.width / 2;
    const sectionCenter = sectionBox!.x + sectionBox!.width / 2;
    expect(Math.abs(buttonCenter - sectionCenter), `${name} centering`).toBeLessThanOrEqual(2);
  }
});

test('guest landing renders all sections with landmarks and Angular copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(hero);
  await expect(page.getByRole('link', { name: 'UpTrack home' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Authentication' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Everything you need to stay compliant' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your compliance status, at a glance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start tracking your credentials today' })).toBeVisible();
  await expect(page.getByAltText('UpTrack dashboard preview')).toBeVisible();
  await expect(page.getByAltText('UpTrack credential drawer preview')).toBeVisible();
  await expect(page.getByText('Designed for healthcare professionals, powered by React and Spring Boot')).toBeVisible();
  await expect(page.getByText('© 2026 UpTrack')).toBeVisible();
  // No dialog without an explicit trigger or ?auth= parameter.
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of viewports) {
    test(`no horizontal overflow at ${width}px in ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await setTheme(page, theme);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noOverflow(page);
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1280] as const) {
    test(`interactive targets are at least 44px at ${width}px in ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await setTheme(page, theme);
      await page.goto('/');
      // 43.5px floor allows for sub-pixel float rounding of the 44px (min-h-11) design value.
      for (const name of ['Switch to dark mode', 'Switch to light mode']) {
        const toggle = page.getByRole('button', { name, exact: true });
        if (await toggle.count()) {
          const box = await toggle.boundingBox();
          expect(box?.height, 'theme toggle height').toBeGreaterThanOrEqual(43.5);
          expect(box?.width, 'theme toggle width').toBeGreaterThanOrEqual(43.5);
        }
      }
      for (const name of ['Log In', 'Sign Up', 'Get Started', 'Get Started for Free']) {
        const box = await page.getByRole('button', { name, exact: true }).boundingBox();
        expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(43.5);
      }
      if (width === 375) {
        // Header actions must stay on one line (a wrap would push the 44px button past ~60px).
        for (const name of ['Log In', 'Sign Up']) {
          const box = await page.getByRole('button', { name, exact: true }).boundingBox();
          expect(box?.height, `${name} single-line height`).toBeLessThanOrEqual(50);
        }
      }
    });
  }
}

test('each auth trigger opens the existing dialog in the correct mode and focus returns on close', async ({ page }) => {
  await page.goto('/');
  const triggers: Array<{ button: string; dialog: string }> = [
    { button: 'Log In', dialog: 'Log in' },
    { button: 'Sign Up', dialog: 'Sign up' },
    { button: 'Get Started', dialog: 'Sign up' },
    { button: 'Get Started for Free', dialog: 'Sign up' },
  ];
  for (const { button, dialog } of triggers) {
    const trigger = page.getByRole('button', { name: button, exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.getByRole('dialog', { name: dialog })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('query-driven dialog keeps returnTo on close and restores it after mocked login', async ({ page }) => {
  allowApi(page, 'POST', '/api/auth/login');
  await page.route(/^http:\/\/localhost:5173\/api\/auth\/login$/, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: e2eToken, user: e2eUser }) }),
  );
  await page.goto('/?auth=login&returnTo=%2Fcredentials');
  const dialog = page.getByRole('dialog', { name: 'Log in' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Email').fill('test.user@example.test');
  await dialog.getByLabel('Password').fill('secret');
  await dialog.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/credentials$/);
});

test('authenticated visitor is redirected to the dashboard without a landing flash', async ({ page }) => {
  await signIn(page);
  await mockDashboard(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: hero })).toHaveCount(0);
});

test('theme toggle persists and swaps preview images', async ({ page }) => {
  // Seed via storage (not an init script) so a reload proves real persistence.
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('uptrack-theme', 'light'));
  await page.reload();
  const dashboard = page.getByAltText('UpTrack dashboard preview');
  expect(await dashboard.getAttribute('src')).toContain('light-mode-dashboard.png');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  expect(await dashboard.getAttribute('src')).toContain('dark-mode-dashboard.png');
  expect(await page.evaluate(() => localStorage.getItem('uptrack-theme'))).toBe('dark');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  expect(await dashboard.getAttribute('src')).toContain('dark-mode-dashboard.png');
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 768, 1280] as const) {
    test(`candidate evidence: ${theme} landing at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await setTheme(page, theme);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(300);
      await capture(page, `landing-candidate-${theme}-${width}`);
      await page.screenshot({ path: resolve(evidenceDirectory, `landing-candidate-${theme}-${width}-full.png`), fullPage: true, animations: 'disabled' });
    });
  }
}
