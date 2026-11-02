import { test as base, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const evidenceDirectory = resolve('../context/migration/verification/m04-evidence');
export const test = base.extend<{ networkIsolation: void }>({
  networkIsolation: [async ({ page }, use) => {
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(resolve(evidenceDirectory, 'browser.json'), JSON.stringify({ browser: page.context().browser()?.version(), platform: process.platform, apiRequestsExpected: 0 }, null, 2) + '\n');
    const apiRequests: string[] = [];
    const errors: string[] = [];
    await page.route('**/api{,/**}', async route => {
      apiRequests.push(new URL(route.request().url()).pathname);
      await route.abort();
    });
    page.on('request', request => {
      if (/\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(new URL(request.url()).pathname);
    });
    page.on('pageerror', error => errors.push(error.message));
    await use();
    expect(apiRequests, 'M04 must not contact an API').toEqual([]);
    expect(errors, 'No uncaught browser errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function capture(page: Page, name: string) {
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), animations: 'disabled' });
}
export async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const main = page.locator('#main-content');
  if (await main.count()) expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
}
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(value => localStorage.setItem('uptrack-theme', value), theme);
}
