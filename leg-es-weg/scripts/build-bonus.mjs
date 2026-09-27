// Renders the five lock-screen wallpapers (src/wallpapers.html) to output/bonus/*.png
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'output', 'bonus');
fs.mkdirSync(outDir, { recursive: true });

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1290, height: 2796 } });
await page.goto(pathToFileURL(path.join(root, 'src', 'wallpapers.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const items = await page.$$('.wp');
for (let i = 0; i < items.length; i++) {
  await items[i].screenshot({ path: path.join(outDir, `Sperrbildschirm-${i + 1}.png`) });
}
console.log(`${items.length} wallpapers written to ${outDir}`);
await browser.close();
