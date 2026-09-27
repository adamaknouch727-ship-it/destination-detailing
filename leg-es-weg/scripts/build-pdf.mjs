// Renders src/guide.html to output/Leg-es-weg.pdf with Chromium (Playwright).
// Usage: node scripts/build-pdf.mjs [--preview]   (--preview also writes page PNGs)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src', 'guide.html');
const outDir = path.join(root, 'output');
const previewDir = path.join(root, 'output', 'preview');
const preview = process.argv.includes('--preview');

fs.mkdirSync(outDir, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// Layout QA: any element that sticks out of its page, and pages whose content overflows.
const problems = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.page').forEach((pg, i) => {
    const pr = pg.getBoundingClientRect();
    const footer = pg.querySelector('.pf');
    const limit = footer ? footer.getBoundingClientRect().top - 1 : pr.bottom;
    pg.querySelectorAll('*').forEach(el => {
      if (el.closest('.pf') || el.closest('svg') && el.tagName !== 'svg') return;
      if (el.classList.contains('sunarc')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.bottom > limit + 0.5 && !(pg.classList.contains('cover') || pg.classList.contains('back'))) {
        out.push(`page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> ends ${(r.bottom - limit).toFixed(1)}px below content area: "${(el.textContent || '').trim().slice(0, 50)}"`);
      }
      if (r.right > pr.right + 0.5) out.push(`page ${i + 1}: element overflows right edge: ${el.tagName} "${(el.textContent || '').trim().slice(0, 40)}"`);
    });
  });
  return [...new Set(out)];
});
if (problems.length) { console.log('LAYOUT PROBLEMS:\n' + problems.slice(0, 60).join('\n')); } else { console.log('Layout OK: nothing overflows.'); }

const fontsLoaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.style}`));
console.log('Fonts loaded:', [...new Set(fontsLoaded)].join(', '));

const pdfPath = path.join(outDir, 'Leg-es-weg.pdf');
await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
console.log('PDF written:', pdfPath, (fs.statSync(pdfPath).size / 1024).toFixed(0) + ' KB');

if (preview) {
  fs.mkdirSync(previewDir, { recursive: true });
  await page.setViewportSize({ width: 900, height: 1300 });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(previewDir, `page-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log(`Preview PNGs: ${pages.length} pages in ${previewDir}`);
}
await browser.close();
