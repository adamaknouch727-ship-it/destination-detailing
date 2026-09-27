// Renders the Gumroad cover images (2560x1440) and thumbnail (1200x1200) to output/gumroad/.
// Needs output/bonus/*.png first (node scripts/build-bonus.mjs).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'output', 'gumroad');
const pagesDir = path.join(outDir, '_pages');
fs.mkdirSync(pagesDir, { recursive: true });

const browser = await playwright.chromium.launch();

// 1) Sharp page renders of the guide (2x) used inside the covers.
const guide = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });
await guide.goto(pathToFileURL(path.join(root, 'src', 'guide.html')).href, { waitUntil: 'networkidle' });
await guide.evaluate(() => document.fonts.ready);
const pages = await guide.$$('.page');
for (const n of [1, 8, 10, 12, 13, 15, 16, 21]) {
  await pages[n - 1].screenshot({ path: path.join(pagesDir, `page-${String(n).padStart(2, '0')}.png`) });
}

// 2) Covers and thumbnail.
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.goto(pathToFileURL(path.join(root, 'src', 'gumroad.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
for (const id of ['cover-1', 'cover-2', 'cover-3', 'thumbnail']) {
  await (await page.$('#' + id)).screenshot({ path: path.join(outDir, `${id}.png`) });
}
console.log('Gumroad images written to', outDir);
await browser.close();
