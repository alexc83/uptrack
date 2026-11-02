import { test, expect, capture, noOverflow, setTheme, signIn } from './helpers';

for (const theme of ['light', 'dark'] as const) {
  test(`theme ${theme}: tokens, Flowbite colors and persisted toggle`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
    await setTheme(page, theme);
    await signIn(page);
    await page.goto('/settings');
    const expected = theme === 'light' ? 'rgb(24, 95, 165)' : 'rgb(55, 138, 221)';
    await expect(page.getByRole('button', { name: 'Primary action', exact: true })).toHaveCSS('background-color', expected);
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('desktop-sidebar')).toHaveCSS('background-color', theme === 'light' ? 'rgb(248, 249, 250)' : 'rgb(26, 26, 26)');
    await expect(page.getByText('Active', { exact: true }).first()).toHaveCSS('color', theme === 'light' ? 'rgb(39, 80, 10)' : 'rgb(192, 221, 151)');
    await capture(page, `shell-${theme}-1280-tokens`);
    await page.getByRole('button', { name: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode' }).click();
    const next = theme === 'light' ? 'dark' : 'light';
    expect(await page.evaluate(() => localStorage.getItem('uptrack-theme'))).toBe(next);
    // Remove init script by testing persistence in a fresh page sharing this context.
    const reloaded = await page.context().newPage();
    await reloaded.goto('/credentials');
    expect(await reloaded.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(next === 'dark');
    await reloaded.close();
    await noOverflow(page);
  });
}

for (const path of ['/', '/credentials', '/credentials/preview/ce-report']) {
  test(`pre-paint script works without React at ${path}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await setTheme(page, 'dark');
    // Vite serves the entry as /src/main.tsx?t=<timestamp>; a plain glob would not match the query string.
    let blocked = 0;
    await page.route(/\/src\/main\.tsx(\?.*)?$/, route => { blocked += 1; return route.abort(); });
    await page.goto(path);
    expect(blocked).toBeGreaterThan(0);
    await expect(page.locator('html')).toHaveClass('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(page.locator('#root')).toBeEmpty();
  });
}

for (const storage of ['absent', 'invalid', 'denied'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`OS ${colorScheme}, storage ${storage}: startup fallback and safe interaction`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await signIn(page);
      await page.addInitScript(value => {
        if (value === 'invalid') localStorage.setItem('uptrack-theme', 'invalid');
        if (value === 'denied') {
          // M06: only the theme key is denied so the (mocked) session can still start; the theme behaviour under test is unchanged.
          const originalGet = Storage.prototype.getItem;
          const originalSet = Storage.prototype.setItem;
          Storage.prototype.getItem = function (key: string) { if (key === 'uptrack-theme') throw new Error('denied'); return originalGet.call(this, key); };
          Storage.prototype.setItem = function (key: string, v: string) { if (key === 'uptrack-theme') throw new Error('denied'); return originalSet.call(this, key, v); };
        }
      }, storage);
      await page.goto('/credentials');
      expect(await page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(colorScheme === 'dark');
      await page.getByRole('button', { name: colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' }).click();
      expect(await page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(colorScheme === 'light');
    });
  }
}

test('reduced motion disables skeleton and content animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await page.goto('/settings');
  await expect(page.locator('.animate-pulse')).toHaveCSS('animation-name', 'none');
  await page.evaluate(() => localStorage.removeItem('uptrack_token'));
  await page.goto('/');
  await expect(page.locator('.ut-fade-in')).toHaveCSS('animation-name', 'none');
});
