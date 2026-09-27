// Renders the TikTok slideshows defined in tiktok/posts.json to
// tiktok/output/<folder>/01.jpg … 12.jpg plus POST.txt and caption.txt per post.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tk = path.join(root, 'tiktok');
const posts = JSON.parse(fs.readFileSync(path.join(tk, 'posts.json'), 'utf8'));
const PIN = '📌 Der komplette 30-Tage-Plan „Leg es weg.“: aminarahim.gumroad.com/l/legesweg';

const browser = await playwright.chromium.launch();

// 1) PDF pages used inside the slides (2x for sharpness).
const pagesDir = path.join(tk, '_pages');
fs.mkdirSync(pagesDir, { recursive: true });
const guide = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });
await guide.goto(pathToFileURL(path.join(root, 'src', 'guide.html')).href, { waitUntil: 'networkidle' });
await guide.evaluate(() => document.fonts.ready);
const pageEls = await guide.$$('.page');
for (const n of [1, 7, 16, 20]) {
  await pageEls[n - 1].screenshot({ path: path.join(pagesDir, `page-${String(n).padStart(2, '0')}.png`) });
}

// 2) Slides.
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(tk, 'slides.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(p => window.renderAll(p), posts);
await page.evaluate(async () => {
  await document.fonts.ready;
  const urls = new Set();
  document.querySelectorAll('.bg').forEach(el => { const m = /url\("?([^")]+)"?\)/.exec(el.style.backgroundImage); if (m) urls.add(m[1]); });
  await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
});

const overflow = await page.evaluate(() => [...document.querySelectorAll('.slide')].map(sl => {
  const b = sl.querySelector('.body'); if (!b) return null;
  const kids = [...b.children];
  const top = Math.min(...kids.map(k => k.getBoundingClientRect().top));
  const bottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
  const br = b.getBoundingClientRect();
  return (top < br.top - 1 || bottom > br.bottom + 1) ? `post ${+sl.dataset.post + 1} slide ${+sl.dataset.slide + 1}: content ${Math.round(bottom - top)}px > box ${Math.round(br.height)}px` : null;
}).filter(Boolean));
console.log(overflow.length ? 'OVERFLOW:\n' + overflow.join('\n') : 'All slides fit their text area.');

const slides = await page.$$('.slide');
let k = 0;
for (const post of posts) {
  const dir = path.join(tk, 'output', post.folder);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < post.slides.length; i++, k++) {
    await slides[k].screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  const tag = s => s.img ? s.img : ({ lock: 'bildschirmzeit_sperrbildschirm', chat: 'chat_pdf', notes: 'notizen_rechnung', page: `pdf_seite_${s.page}`,
    mockup: 'pdf_mockup', card: 'karte_frage', sunrise: 'sonnenaufgang', night: 'nacht_lichter' })[s.type];
  const text = s => [s.textTop, s.text, s.cardQ && `[Karte] ${s.cardQ}`, s.notesLines && s.notesLines.join(' | '),
    s.messages && s.messages.map(m => m.file ? '[PDF: Leg-es-weg.pdf]' : `${m.from === 'me' ? 'Ich' : s.chatName}: ${m.text}`).join('\n'),
    s.notifBody && `[Bildschirmzeit] ${s.notifTitle}: ${s.notifBody}`, s.textBottom, s.question].filter(Boolean).join('\n');
  const body = [
    'CAPTION:', post.caption, '',
    'CAPTION (short test):', post.captionShort, '',
    'ERSTER KOMMENTAR (anpinnen):', PIN, '',
    post.title, '',
    ...post.slides.flatMap((s, i) => [`SLIDE ${i + 1} -> ${tag(s)}`, text(s), ''])
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'POST.txt'), body);
  fs.writeFileSync(path.join(dir, 'caption.txt'), post.caption + '\n');
  console.log(`${post.folder}: ${post.slides.length} slides`);
}
await browser.close();
