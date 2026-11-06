/* global console, process */
import { chromium } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

// Shield path from public/favicon.svg
const shieldPath = 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z';

function generateSvg({ size, cornerRadius = 0, paddingPercent = 0.22, strokeWidth = 2 }) {
  // viewBox 0 0 size size
  // Shield is originally 24x24, center is (12, 12)
  const targetShieldSize = size * (1 - paddingPercent * 2);
  const scale = targetShieldSize / 24;
  const offset = (size - 24 * scale) / 2;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#185fa5" />
      <g transform="translate(${offset}, ${offset}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
        <path d="${shieldPath}" />
      </g>
    </svg>
  `;
}

async function render() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const icons = [
    {
      file: 'apple-touch-icon.png',
      svg: generateSvg({ size: 180, cornerRadius: 0, paddingPercent: 0.22, strokeWidth: 1.8 }),
      size: 180,
    },
    {
      file: 'pwa-192x192.png',
      svg: generateSvg({ size: 192, cornerRadius: 40, paddingPercent: 0.22, strokeWidth: 1.8 }),
      size: 192,
    },
    {
      file: 'pwa-512x512.png',
      svg: generateSvg({ size: 512, cornerRadius: 108, paddingPercent: 0.22, strokeWidth: 1.8 }),
      size: 512,
    },
    {
      file: 'pwa-512x512-maskable.png',
      // Maskable icon must have solid background bleed and inner emblem within 80% safe zone
      svg: generateSvg({ size: 512, cornerRadius: 0, paddingPercent: 0.28, strokeWidth: 1.8 }),
      size: 512,
    },
  ];

  for (const icon of icons) {
    await page.setViewportSize({ width: icon.size, height: icon.size });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">${icon.svg}</body></html>`);
    await page.screenshot({
      path: resolve(publicDir, icon.file),
      omitBackground: true,
    });
    console.log(`Generated ${icon.file} (${icon.size}x${icon.size})`);
  }

  await browser.close();
}

render().catch(err => {
  console.error(err);
  process.exit(1);
});
