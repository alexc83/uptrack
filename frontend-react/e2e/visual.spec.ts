import { test, expect, setTheme, signIn } from './helpers';

test.beforeEach(async ({ page }) => { await signIn(page); });

// Golden images are established only after inspecting the matching M04 evidence
// against the M01 shell references. Test retries never update these baselines.
for (const theme of ['light', 'dark'] as const) {
  test(`visual ${theme} desktop shell and collapsed navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setTheme(page, theme);
    await page.goto('/preview');
    await expect(page.getByRole('heading', { name: 'Shared UI preview', exact: true })).toBeVisible();
    await expect(page.getByText('Loading presentation preview')).toHaveCount(0); // lazy preview chunk must be mounted before capture
    await expect(page).toHaveScreenshot(`shell-${theme}-desktop.png`, { animations: 'disabled' });
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page).toHaveScreenshot(`shell-${theme}-collapsed.png`, { animations: 'disabled' });
  });
  test(`visual ${theme} mobile navigation and modal`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await setTheme(page, theme);
    await page.goto('/preview');
    await expect(page.getByRole('heading', { name: 'Shared UI preview', exact: true })).toBeVisible();
    await expect(page.getByText('Loading presentation preview')).toHaveCount(0); // lazy preview chunk must be mounted before capture
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page).toHaveScreenshot(`shell-${theme}-mobile-navigation.png`, { animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open modal', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Modal example field' })).toBeFocused();
    await expect(page).toHaveScreenshot(`modal-${theme}-mobile.png`, { animations: 'disabled' });
  });
}
