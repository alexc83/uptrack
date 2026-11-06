import { test, expect, capture, mockCredentialReads, mockDashboard, noOverflow, setTheme, signIn } from './helpers';

const viewports = [375, 768, 1280] as const;

test('guest reaches the Help Center from the landing footer without logging in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Public pages' }).getByRole('link', { name: 'Help Center' }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole('heading', { level: 1, name: 'UpTrack Help Center' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Authentication' }).getByRole('link')).toHaveCount(0);
});

test('navigates categories and articles, with breadcrumbs, related links and document titles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/help');
  await page.getByRole('navigation', { name: 'Help Center categories' }).getByRole('link', { name: 'Add a Credential', exact: true }).click();
  await expect(page).toHaveURL(/\/help\/credentials\/add-a-credential$/);
  await expect(page).toHaveTitle('Add a Credential — UpTrack Help Center');
  await expect(page.getByRole('heading', { level: 1, name: 'Add a Credential' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Add a Credential', exact: true, includeHidden: false }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Credentials' }).click();
  await expect(page).toHaveURL(/\/help\/credentials$/);
  await page.getByRole('link', { name: /Delete a Credential/ }).first().click();
  await page.getByRole('region', { name: 'Related articles' }).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/help\/.+\/.+/);
});

test('every article is reachable and has a heading, via the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/help');
  const links = page.getByRole('navigation', { name: 'Help Center categories' }).locator('li li a');
  await expect(links).toHaveCount(20);
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('main').locator('h2').first()).toBeVisible();
  }
});

test('search is keyboard operable and finds articles by body text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/help');
  const box = page.getByRole('combobox', { name: 'Search the Help Center' });
  await box.fill('caps lock');
  await expect(page.getByRole('option').first()).toContainText("I Can't Log In");
  await box.press('Escape');
  await expect(box).toHaveValue('');
  await box.fill('certificate');
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/help\/.+\/.+/);
  await expect(page.getByRole('combobox')).toHaveValue('');
});

test('direct links and refreshes work on article URLs', async ({ page }) => {
  await page.goto('/help/troubleshooting/cannot-log-in');
  await expect(page.getByRole('heading', { level: 1, name: "I Can't Log In" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: "I Can't Log In" })).toBeVisible();
  await page.goto('/help/credentials/not-an-article');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('mobile menu opens, closes with Escape and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/help/credentials/add-a-credential');
  const menu = page.getByRole('button', { name: 'Open Help Center menu' });
  await expect(page.getByRole('navigation', { name: 'Help Center categories' })).toBeHidden();
  await menu.click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('navigation', { name: 'Help Center categories' }).getByRole('link', { name: 'Print a CE Report' }).click();
  await expect(page).toHaveURL(/\/help\/continuing-education\/print-ce-report$/);
  await expect(page.getByRole('navigation', { name: 'Help Center categories' })).toBeHidden();
});

test('roadmap footer links to the Help Center', async ({ page }) => {
  await page.goto('/roadmap');
  await page.getByRole('navigation', { name: 'Public pages' }).getByRole('link', { name: 'Help Center' }).click();
  await expect(page).toHaveURL(/\/help$/);
});

test('signed-in user reaches the Help Center from the sidebar and keeps the session', async ({ page }) => {
  await signIn(page);
  await mockDashboard(page);
  await mockCredentialReads(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Help Center', exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole('heading', { level: 1, name: 'UpTrack Help Center' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
});

test('collapsed and mobile application navigation both expose Help Center', async ({ page }) => {
  await signIn(page);
  await mockDashboard(page);
  await mockCredentialReads(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.getByRole('link', { name: 'Help Center', exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Help Center', exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of viewports) {
    test(`article renders without horizontal overflow at ${width}px in ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setTheme(page, theme);
      await page.goto('/help/credentials/understand-credential-status');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noOverflow(page);
      await capture(page, `help-article-${theme}-${width}`);
    });
  }
}
