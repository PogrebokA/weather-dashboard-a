import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../screenshots');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base);
  await page.fill('#city-input', 'Казань');
  await page.click('#search-form button[type="submit"]');
  await page.locator('.result-button').first().click();
  await page.locator('#dashboard').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'stage3-after-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, 'stage3-after-mobile.png'), fullPage: true });
  console.log('Captured stage3-after-desktop.png and stage3-after-mobile.png');
} finally {
  await browser.close();
}
