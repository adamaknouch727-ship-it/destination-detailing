// Renders the v2 TikTok slideshows (1080x1620, native story style) defined in tiktok/posts2.json
// to tiktok/output/<folder>/01.jpg … 12.jpg plus POST.txt and caption.txt per post.
// The printed PDF pages shown in the slides are annotated (marker, pen, handwriting) straight from src/guide.html.
// Optional arguments: folder names to render only those posts.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tk = path.join(root, 'tiktok');
const data = JSON.parse(fs.readFileSync(path.join(tk, 'posts2.json'), 'utf8'));
const only = process.argv.slice(2);
const posts = only.length ? data.posts.filter(p => only.includes(p.folder)) : data.posts;
const PIN = '📌 Der komplette 30-Tage-Plan „Leg es weg.“: aminarahim.gumroad.com/l/legesweg';

const browser = await playwright.chromium.launch();

// 1) Printed pages: the cover plus every annotated page (2x for sharpness).
const annotDir = path.join(tk, '_annot');
fs.mkdirSync(annotDir, { recursive: true });
const guideUrl = pathToFileURL(path.join(root, 'src', 'guide.html')).href;
const guide = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 });
const openGuide = async () => { await guide.goto(guideUrl, { waitUntil: 'networkidle' }); await guide.evaluate(() => document.fonts.ready); };
await openGuide();
await (await guide.$$('.page'))[0].screenshot({ path: path.join(annotDir, 'cover.png') });

function annotate(spec) {
  const pageEl = document.querySelectorAll('.page')[spec.page - 1];
  const pr = pageEl.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:50';
  pageEl.appendChild(layer);
  const nodes = []; let full = '';
  const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const n = walker.currentNode; nodes.push([n, full.length]); full += n.data.replace(/ /g, ' '); }
  const missing = [];
  const lineRects = phrase => {
    const i = full.indexOf(phrase);
    if (i < 0) { missing.push(phrase); return []; }
    const j = i + phrase.length, r = document.createRange();
    for (const [n, st] of nodes) if (i >= st && i < st + n.data.length) { r.setStart(n, i - st); break; }
    for (const [n, st] of nodes) if (j > st && j <= st + n.data.length) { r.setEnd(n, j - st); break; }
    const lines = [];
    for (const b of r.getClientRects()) {
      if (b.width < 1) continue;
      const l = lines.find(k => Math.abs(k.top - b.top) < 4);
      if (l) { l.left = Math.min(l.left, b.left); l.right = Math.max(l.right, b.right); l.bottom = Math.max(l.bottom, b.bottom); }
      else lines.push({ left: b.left, right: b.right, top: b.top, bottom: b.bottom });
    }
    return lines.map(l => ({ x: l.left - pr.left, y: l.top - pr.top, w: l.right - l.left, h: l.bottom - l.top }));
  };
  const INK = '#2340a8';
  for (const ph of spec.highlight || []) for (const l of lineRects(ph)) {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${l.x - 3}px;top:${l.y + l.h * .1}px;width:${l.w + 7}px;height:${l.h * .88}px;background:rgba(255,226,38,.66);mix-blend-mode:multiply;border-radius:3px 8px 4px 9px;transform:rotate(-.4deg)`;
    layer.appendChild(d);
  }
  for (const ph of spec.underline || []) for (const l of lineRects(ph)) {
    const W = l.w + 10;
    layer.insertAdjacentHTML('beforeend', `<svg width="${W}" height="10" style="position:absolute;left:${l.x - 4}px;top:${l.y + l.h - 3}px;overflow:visible"><path d="M2 5 Q ${W * .3} 8 ${W * .55} 4.6 T ${W - 2} 4.4" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/></svg>`);
  }
  for (const ph of spec.box || []) {
    const ls = lineRects(ph); if (!ls.length) continue;
    const x0 = Math.min(...ls.map(l => l.x)) - 9, y0 = Math.min(...ls.map(l => l.y)) - 6;
    const W = Math.max(...ls.map(l => l.x + l.w)) + 9 - x0, H = Math.max(...ls.map(l => l.y + l.h)) + 6 - y0;
    layer.insertAdjacentHTML('beforeend', `<svg width="${W + 20}" height="${H + 20}" style="position:absolute;left:${x0 - 10}px;top:${y0 - 10}px;overflow:visible"><path d="M14 11 C ${W * .4} 8, ${W * .7} 10, ${W + 9} 11 C ${W + 12} ${H * .4}, ${W + 11} ${H * .8}, ${W + 7} ${H + 10} C ${W * .6} ${H + 12}, ${W * .3} ${H + 11}, 10 ${H + 9} C 8 ${H * .6}, 9 ${H * .3}, 18 7" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/></svg>`);
  }
  for (const n of spec.notes || []) {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${n.x}%;top:${n.y}%;font-family:Caveat,cursive;font-weight:700;font-size:${n.size || 26}px;line-height:1.05;color:${INK};white-space:pre;transform:rotate(${n.r || 0}deg);transform-origin:0 0`;
    d.textContent = n.text;
    layer.appendChild(d);
  }
  return missing;
}

for (const [key, spec] of Object.entries(data.annotations)) {
  await openGuide();
  const missing = await guide.evaluate(annotate, spec);
  if (missing.length) throw new Error(`${key}: phrase not found on page ${spec.page}: ${missing.join(' | ')}`);
  await (await guide.$$('.page'))[spec.page - 1].screenshot({ path: path.join(annotDir, `${key}.png`) });
}
console.log('Annotated pages written to', annotDir);

// 2) Slides.
const page = await browser.newPage({ viewport: { width: 1080, height: 1620 } });
await page.goto(pathToFileURL(path.join(tk, 'slides2.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(d => window.renderAll(d), { posts });
await page.evaluate(async () => {
  await document.fonts.ready;
  const urls = new Set();
  document.querySelectorAll('.photo').forEach(el => { const m = /url\("?([^")]+)"?\)/.exec(el.style.backgroundImage); if (m) urls.add(m[1]); });
  await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
});

// QA: every text block must stay inside the safe area (TikTok UI covers the bottom and the right edge).
const problems = await page.evaluate(() => [...document.querySelectorAll('.slide')].flatMap(sl => {
  const t = sl.querySelector('.txt'); if (!t) return [];
  const s = sl.getBoundingClientRect(), b = t.getBoundingClientRect();
  const id = `post ${+sl.dataset.post + 1} slide ${+sl.dataset.slide + 1}`;
  const out = [];
  if (b.top - s.top < 40) out.push(`${id}: text starts too high (${Math.round(b.top - s.top)}px)`);
  if (s.bottom - b.bottom < 170) out.push(`${id}: text reaches the bottom UI zone (${Math.round(s.bottom - b.bottom)}px left)`);
  return out;
}));
console.log(problems.length ? 'TEXT PROBLEMS:\n' + problems.join('\n') : 'All text blocks are inside the safe area.');

const slides = await page.$$('.slide');
const tag = s => {
  if (s.bg === 'photo') return `foto: ${s.img}${s.blur ? ' (unscharf)' : ''}`;
  if (s.bg === 'chat') return `chat-screenshot: ${s.chat.name}`;
  if (s.bg === 'lock') return 'sperrbildschirm mit bildschirmzeit-bericht';
  if (s.bg === 'paper') return { notebook: 'handgeschriebene liste im schulheft', card: 'handgeschriebene rezeptkarte', sticky: 'klebezettel am spiegel' }[s.paper.kind];
  if (s.bg === 'annot') return `ausgedruckte pdf-seite ${data.annotations[s.annot].page}, markiert${s.blur ? ' (unscharf)' : ''}`;
  if (s.bg === 'exemplar') return `ausgedrucktes exemplar${s.surface === 'fridge' ? ' am kühlschrank' : ''}`;
  if (s.bg === 'sky') return s.sky?.variant === 'dusk' ? 'himmel am abend' : 'himmel bei sonnenaufgang';
  return s.bg;
};
const details = s => [
  s.chat && s.chat.messages.map(m => m.file ? `[${s.chat.name}: Leg-es-weg.pdf]` : `[${m.from === 'me' ? 'Ich' : s.chat.name}: ${m.text}]`).join('\n'),
  s.lock && `[${s.lock.title}: ${s.lock.body}]`,
  s.paper && `[${[s.paper.title, ...s.paper.lines].filter(Boolean).join(' | ')}]`
].filter(Boolean);

let k = 0;
for (const post of posts) {
  const dir = path.join(tk, 'output', post.folder);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < post.slides.length; i++, k++) {
    await slides[k].screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 91 });
  }
  const body = [
    'CAPTION:', post.caption, '',
    'CAPTION (short test):', post.captionShort, '',
    'ERSTER KOMMENTAR (anpinnen):', PIN, '',
    post.title, '',
    ...post.slides.flatMap((s, i) => [`SLIDE ${i + 1} -> ${tag(s)}`, ...details(s), s.text, ''])
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'POST.txt'), body);
  fs.writeFileSync(path.join(dir, 'caption.txt'), post.caption + '\n');
  console.log(`${post.folder}: ${post.slides.length} slides`);
}
await browser.close();
