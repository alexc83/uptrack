import { test, expect, capture, mockCredentialReads, mockDashboard, noOverflow, setTheme, signIn } from './helpers';

const entryTitles = [
  'Help Center',
  'Installable Mobile Experience (PWA)', 'Expiration Reminders',
  'Dedicated iPhone App', 'Professional Development Portfolio', 'Expanded Reporting and Insights', 'Data Export and Portability',
  'Public Product Roadmap', 'Professional Credential Tracking', 'Continuing Education Tracking', 'Dashboard and Reports', 'Refreshed Application Experience',
];
const viewports = [375, 768, 1280] as const;

test('guest can open the public roadmap and all 12 frozen entries render in order', async ({ page }) => {
  await page.goto('/roadmap');
  await expect(page).toHaveTitle('Product Roadmap — UpTrack');
  await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  await expect(page.getByText("See what we've built, what we're improving, and where UpTrack is headed.")).toBeVisible();
  const sectionHeadings = page.getByRole('heading', { level: 2 });
  await expect(sectionHeadings).toHaveText(['Now', 'Next', 'Later', 'Completed', 'About This Roadmap']);
  for (const name of entryTitles) {
    await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
  }
  const sectionTitles = async (section: string) =>
    page.getByRole('region', { name: section, exact: true }).getByRole('heading', { level: 3 }).allTextContents();
  expect(await sectionTitles('Now')).toEqual(['Help Center']);
  expect(await sectionTitles('Completed')).toEqual(entryTitles.slice(7));
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(12);
  await expect(page.getByText('Priorities may change as UpTrack develops. Planned features are not guaranteed, and no release dates are implied.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to UpTrack' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Roadmap' })).toHaveCount(0);
});

test('landing footer Roadmap link navigates a guest to /roadmap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
});

test('landing footer Roadmap link opens /roadmap at the top of the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('sidebar Roadmap link opens /roadmap at the top of the page', async ({ page }) => {
  await signIn(page);
  await mockDashboard(page);
  await mockCredentialReads(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('signed-in user reaches /roadmap from the sidebar link and keeps the session', async ({ page }) => {
  await signIn(page);
  await mockDashboard(page);
  await mockCredentialReads(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of viewports) {
    test(`roadmap renders without horizontal overflow at ${width}px in ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setTheme(page, theme);
      await page.goto('/roadmap');
      await expect(page.getByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
      for (const name of entryTitles) {
        await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
      }
      await noOverflow(page);
      await capture(page, `roadmap-${theme}-${width}`);
    });
  }
}
