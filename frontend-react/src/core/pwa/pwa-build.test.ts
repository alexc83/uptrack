import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA Build Artifacts & Configuration', () => {
  const distDir = resolve(__dirname, '../../../dist');

  it('generates dist/manifest.webmanifest with valid fields and no orientation lock', () => {
    const manifestPath = resolve(distDir, 'manifest.webmanifest');
    expect(existsSync(manifestPath), 'dist/manifest.webmanifest must exist after build').toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('UpTrack');
    expect(manifest.short_name).toBe('UpTrack');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#eef0f3');
    expect(manifest.theme_color).toBe('#185fa5');
    // Orientation must not be locked
    expect(manifest.orientation).toBeUndefined();

    // Icons
    expect(manifest.icons).toBeInstanceOf(Array);
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && !i.purpose);
    const maskable512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable512).toBeDefined();
  });

  it('generates dist/sw.js with strictly constrained precaching and no API runtime caching', () => {
    const swPath = resolve(distDir, 'sw.js');
    expect(existsSync(swPath), 'dist/sw.js must exist after build').toBe(true);

    const sw = readFileSync(swPath, 'utf-8');

    // Navigation fallback points to index.html with API denylist
    expect(sw).toContain('createHandlerBoundToURL("/index.html")');
    expect(sw).toMatch(/denylist:\[\/\^\\\/api\/\]/);

    // Skip waiting message handler for controlled prompt updates
    expect(sw).toContain('SKIP_WAITING');

    // Outdated caches cleanup
    expect(sw).toContain('cleanupOutdatedCaches()');

    // Zero API or sensitive storage
    expect(sw).not.toMatch(/registerRoute\([^)]*['"]\/api/);
    expect(sw).not.toMatch(/cloudinary/i);
  });
});
