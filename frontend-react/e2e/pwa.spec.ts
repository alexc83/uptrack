import { test, expect } from './helpers';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('PWA01 — Web App Manifest and App Shell Assets', () => {
  test('serves valid web application manifest', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('UpTrack');
    expect(manifest.short_name).toBe('UpTrack');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#eef0f3');
    expect(manifest.theme_color).toBe('#185fa5');

    // Refinement 7: Must NOT be locked to portrait
    expect(manifest.orientation).toBeUndefined();

    // Verify icons structure
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    const maskable = manifest.icons.find((icon: { purpose?: string }) => icon.purpose === 'maskable');
    expect(maskable).toBeDefined();
    expect(maskable.sizes).toBe('512x512');
  });

  test('serves all required PWA and Apple touch icon assets with correct image headers', async ({ request }) => {
    const iconPaths = [
      '/apple-touch-icon.png',
      '/pwa-192x192.png',
      '/pwa-512x512.png',
      '/pwa-512x512-maskable.png',
      '/favicon.svg',
    ];

    for (const path of iconPaths) {
      const response = await request.get(path);
      expect(response.status(), `Icon at ${path} must return 200`).toBe(200);
      const contentType = response.headers()['content-type'] ?? '';
      if (path.endsWith('.png')) {
        expect(contentType).toContain('image/png');
      } else if (path.endsWith('.svg')) {
        expect(contentType).toContain('image/svg+xml');
      }
    }
  });

  test('HTML head includes iOS meta tags, safe-area viewport, and theme colors', async ({ page }) => {
    await page.goto('/');

    // Viewport-fit=cover
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('viewport-fit=cover');

    // Apple web app meta tags
    const capable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(capable).toBe('yes');

    const statusBarStyle = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content');
    expect(statusBarStyle).toBe('default');

    const appTitle = await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content');
    expect(appTitle).toBe('UpTrack');

    // Apple touch icon link
    const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleIcon).toBe('/apple-touch-icon.png');

    // Light and dark theme colors
    const lightTheme = await page.locator('meta[name="theme-color"][media*="light"]').getAttribute('content');
    expect(lightTheme).toBe('#185fa5');

    const darkTheme = await page.locator('meta[name="theme-color"][media*="dark"]').getAttribute('content');
    expect(darkTheme).toBe('#111111');
  });
});

test.describe('PWA01 — Service Worker Security & Cache Restrictions', () => {
  test('production sw.js strictly excludes /api/ from navigation fallback and has no runtime api caching', () => {
    const distSwPath = resolve(__dirname, '../dist/sw.js');
    if (!existsSync(distSwPath)) {
      test.skip();
      return;
    }

    const swContent = readFileSync(distSwPath, 'utf-8');

    // Verify navigation denylist protects /api/
    expect(swContent).toMatch(/denylist:\[\/\^\\\/api\/\]/);

    // Verify no runtime caching matches /api or document URLs
    expect(swContent).not.toMatch(/registerRoute\([^)]*['"]\/api/);
    expect(swContent).not.toMatch(/cloudinary/i);
    expect(swContent).not.toMatch(/signed/i);
  });
});
