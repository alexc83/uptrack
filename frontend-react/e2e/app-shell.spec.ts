import { test, expect, capture, noOverflow, setTheme } from './helpers';

test('desktop geometry, persistence, navigation, account menu and independent scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setTheme(page, 'light');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Shared UI preview', exact: true })).toBeVisible();
  const sidebar = page.getByTestId('desktop-sidebar');
  await expect(sidebar).toHaveCSS('width', '272px');
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  await capture(page, 'shell-light-1280-expanded');
  const positions = await sidebar.boundingBox();
  await page.locator('main').evaluate(element => { element.scrollTop = 500; });
  expect(await page.locator('main').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await sidebar.boundingBox()).toEqual(positions);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '88px');
  await capture(page, 'shell-light-1280-collapsed');
  await page.reload();
  await expect(sidebar).toHaveCSS('width', '88px');
  for (const name of ['Credentials', 'CE Records', 'Dashboard']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('button', { name: 'Open account menu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Preview account — not signed in')).toBeVisible();
  await expect(page.getByRole('button', { name: /Log out/ })).toBeDisabled();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page).toHaveTitle('Settings — UpTrack');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '272px');
  await noOverflow(page);
});

for (const width of [375, 768]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`mobile ${width} ${theme}: dismissal, focus, target sizes and route completion`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await setTheme(page, theme);
      await page.goto('/dashboard');
      const trigger = page.getByRole('button', { name: 'Open navigation' });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await capture(page, `shell-${theme}-${width}-closed`);
      for (const dismissal of ['escape', 'close', 'backdrop']) {
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Navigation' });
        await expect(dialog).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(await page.locator('#root').evaluate(element => element instanceof HTMLElement && element.inert)).toBe(true);
        const bounds = await dialog.boundingBox();
        expect(bounds?.width).toBe(Math.min(300, width - 32));
        const controls = dialog.locator('button, a');
        for (const control of await controls.all()) {
          const box = await control.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(44);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
        await noOverflow(page);
        if (dismissal === 'escape') {
          await capture(page, `shell-${theme}-${width}-open`);
          await page.keyboard.press('Shift+Tab');
          expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
          await page.keyboard.press('Escape');
        } else if (dismissal === 'close') await page.getByRole('button', { name: 'Close navigation' }).click();
        else await page.mouse.click(width - 5, 300);
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
      await trigger.click();
      await page.getByRole('link', { name: 'Credentials', exact: true }).click();
      await expect(page).toHaveURL(/\/credentials$/);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      expect(await page.locator('#root').evaluate(element => element instanceof HTMLElement && element.inert)).toBe(false);
    });
  }
}

test('767/768/769 breakpoint transitions preserve desktop collapse and remove closed navigation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('uptrack-sidebar-collapsed', 'true'));
  await page.goto('/credentials');
  for (const width of [767, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
    await page.setViewportSize({ width: 769, height: 800 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('desktop-sidebar')).toHaveCSS('width', '88px');
    await noOverflow(page);
  }
});

test('skip link and keyboard-visible focus reach semantic main content', async ({ page }) => {
  await page.goto('/credentials');
  await expect(page.getByRole('heading', { level: 1, name: 'Credentials' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.getByRole('link', { name: 'Credentials', exact: true }).focus();
  expect(await page.getByRole('link', { name: 'Credentials', exact: true }).evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
});

test('exact redirects, query preservation and standalone report route', async ({ page }) => {
  for (const [path, target] of [['/app', '/dashboard'], ['/app/dashboard', '/dashboard'], ['/app/credentials', '/credentials'], ['/app/ce-records', '/ce-records']]) {
    await page.goto(path!);
    await expect(page).toHaveURL(new RegExp(`${target}$`));
  }
  await page.goto('/credentials?credentialId=preview');
  await expect(page).toHaveURL(/credentialId=preview$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/credentials/preview/ce-report?returnTo=%2Fdashboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CE Report');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page).toHaveURL(/returnTo=%2Fdashboard$/);
});
