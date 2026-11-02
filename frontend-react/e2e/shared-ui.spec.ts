import { test, expect, activateWithKeyboard, capture, noOverflow, setTheme, signIn } from './helpers';

test.beforeEach(async ({ page }) => { await signIn(page); });

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 768, 1280]) {
    test(`shared UI ${theme} ${width}: form associations, states, modals and drawers`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await setTheme(page, theme);
      await page.goto('/settings');
      await expect(page.getByRole('region', { name: 'Shared UI preview' })).toBeVisible();
      await noOverflow(page);
      const text = page.getByRole('textbox', { name: 'Example text' });
      await expect(text).toHaveAccessibleDescription('Presentation only; no validation schema.');
      await page.getByRole('checkbox', { name: 'Show example error' }).check();
      await expect(text).toHaveAttribute('aria-invalid', 'true');
      await expect(text).toHaveAccessibleDescription('Presentation only; no validation schema. Example inline error.');
      await text.scrollIntoViewIfNeeded();
      await capture(page, `forms-${theme}-${width}`);
      await page.getByRole('button', { name: 'Retry preview' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Retry callback' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'No matches' })).toBeVisible();
      const errorState = page.getByRole('alert').filter({ has: page.getByRole('heading', { name: 'Preview unavailable' }) });
      await expect(errorState).toHaveCSS('background-color', theme === 'dark' ? 'rgb(45, 21, 21)' : 'rgb(252, 235, 235)');
      await expect(errorState.locator('p')).toHaveCSS('color', theme === 'dark' ? 'rgb(247, 193, 193)' : 'rgb(121, 31, 31)');
      await page.getByRole('heading', { name: 'Preview unavailable' }).scrollIntoViewIfNeeded();
      await capture(page, `states-${theme}-${width}`);
      for (const close of ['escape', 'close', 'backdrop']) {
        const trigger = page.getByRole('button', { name: 'Open modal', exact: true });
        await activateWithKeyboard(page, trigger);
        const dialog = page.getByRole('dialog', { name: 'Modal preview' });
        await expect(dialog).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Modal example field' })).toBeFocused();
        await page.getByRole('textbox', { name: 'Modal example field' }).click();
        await expect(dialog).toBeVisible();
        for (let index = 0; index < 5; index++) {
          await page.keyboard.press('Tab');
          await expect.poll(() => dialog.evaluate(element => ({ inside: element.contains(document.activeElement), active: document.activeElement?.outerHTML.slice(0, 350) }))).toMatchObject({ inside: true });
        }
        if (close === 'escape') { await capture(page, `modal-${theme}-${width}`); await page.keyboard.press('Escape'); }
        else if (close === 'close') await page.getByRole('button', { name: 'Close', exact: true }).click();
        else await page.mouse.click(3, 3);
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
      const drawerTrigger = page.getByRole('button', { name: 'Open drawer', exact: true });
      for (const close of ['escape', 'close', 'backdrop']) {
        await activateWithKeyboard(page, drawerTrigger);
        const drawer = page.getByRole('dialog', { name: 'Drawer preview', exact: true });
        await expect(drawer).toBeVisible();
        const box = await drawer.boundingBox();
        const expectedWidth = width <= 640 ? width : width <= 1024 ? Math.min(width * 0.96, 544) : Math.min(width * 0.92, 480);
        expect(Math.abs((box?.width ?? 0) - expectedWidth)).toBeLessThan(1);
        await noOverflow(page);
        if (close === 'escape') { await capture(page, `drawer-${theme}-${width}`); await page.keyboard.press('Escape'); }
        else if (close === 'close') await page.getByRole('button', { name: 'Close drawer' }).click();
        else if (width > 640) await page.mouse.click(3, 300);
        else {
          // A full-width mobile detail drawer covers its backdrop; verify the
          // backdrop handler directly, while real backdrop clicks run above.
          await page.locator('[data-overlay-layer="drawer"] > div').last().dispatchEvent('click');
        }
        await expect(drawer).toHaveCount(0);
        await expect(drawerTrigger).toBeFocused();
      }
      await page.getByRole('button', { name: 'Open empty drawer' }).click();
      await expect(page.getByRole('button', { name: 'Close drawer' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close drawer' })).toBeFocused();
      await page.keyboard.press('Escape');
      const confirmTrigger = page.getByRole('button', { name: 'Open confirmation' });
      await activateWithKeyboard(page, confirmTrigger);
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(confirmTrigger).toBeFocused();
      await activateWithKeyboard(page, confirmTrigger);
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Preview confirmed' })).toBeVisible();
    });
  }
}

test('nested dialog owns Escape and focus while drawer retains isolation and scroll lock', async ({ page }) => {
  await page.goto('/settings');
  const trigger = page.getByRole('button', { name: 'Open drawer', exact: true });
  await activateWithKeyboard(page, trigger);
  const nested = page.getByRole('button', { name: 'Open nested modal' });
  await activateWithKeyboard(page, nested);
  const modal = page.getByRole('dialog', { name: 'Nested modal preview' });
  await expect(modal).toBeVisible();
  await capture(page, 'nested-overlays');
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press(index % 2 ? 'Shift+Tab' : 'Tab');
    // Eventual: focus may rest briefly on a floating-ui focus guard before being returned into the modal.
    await expect.poll(() => modal.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(nested).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Drawer preview', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  expect(await page.locator('#root').evaluate(element => element instanceof HTMLElement && element.inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.locator('#root').evaluate(element => element instanceof HTMLElement && element.inert)).toBe(false);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
