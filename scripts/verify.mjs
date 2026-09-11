// Drives a real (headless) Chromium over a served site and reports what a
// visitor would hit: horizontal overflow, console errors, failed requests,
// dead links, and viewport screenshots at scroll stops for each width.
//
//   node scripts/verify.mjs <baseUrl> [outDir] [--paths=/,/work] [--widths=1440,810,390] [--stops=6]
//
// Uses chrome-headless-shell (no Dock flicker, signed into nothing).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CH = process.env.CHROME_BIN ||
  '/Users/hardikdewra/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.64/chrome-headless-shell-mac-arm64/chrome-headless-shell';

const args = process.argv.slice(2);
const base = (args.find(a => !a.startsWith('--')) || 'http://localhost:4173').replace(/\/$/, '');
const outDir = args.filter(a => !a.startsWith('--'))[1] || 'verify-out';
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const paths = (opt('paths') || '/').split(',');
const widths = (opt('widths') || '1440,810,390').split(',').map(Number);
const stops = Number(opt('stops') || 6);
const heights = { 1440: 900, 1280: 800, 1024: 768, 810: 1080, 390: 844, 360: 740 };

fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CH, headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--disable-gpu', '--mute-audio'],
});
const report = [];
const links = new Set();

for (const p of paths) {
  for (const w of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: heights[w] || 900, deviceScaleFactor: w <= 430 ? 2 : 1 });
    const errors = [], failed = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', r => failed.push(`${r.failure()?.errorText} ${r.url()}`));
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    const url = base + p;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1200));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = heights[w] || 900;
    const slug = (p === '/' ? 'home' : p.replace(/\W+/g, '-').replace(/^-|-$/g, '')) + '-' + w;
    // Walk the page so scroll-triggered reveals fire, screenshotting evenly spaced stops.
    const n = Math.max(1, Math.min(stops, Math.ceil(total / vh)));
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : Math.round((total - vh) * i / (n - 1));
      await page.evaluate(y => window.scrollTo(0, y), y);
      await new Promise(r => setTimeout(r, 900));
      await page.screenshot({ path: path.join(outDir, `${slug}-${String(i).padStart(2, '0')}.png`) });
    }
    const audit = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const wide = [];
      if (overflow > 0) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > de.clientWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
            wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)}`);
            if (wide.length > 8) break;
          }
        }
      }
      const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.href);
      const deadAnchors = [...document.querySelectorAll('a[href^="#"]')]
        .map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h));
      const emptyLinks = [...document.querySelectorAll('a')].filter(a => !a.getAttribute('href')).length;
      const imgsBroken = [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src);
      const invisible = [...document.querySelectorAll('h1,h2,h3,p,li,a,img')]
        .filter(el => { const s = getComputedStyle(el); return s.opacity === '0' && el.getBoundingClientRect().height > 0; }).length;
      return { overflow, wide, hrefs, deadAnchors, emptyLinks, imgsBroken, invisibleAfterScroll: invisible,
        title: document.title, h1: document.querySelectorAll('h1').length, height: de.scrollHeight };
    });
    audit.hrefs.forEach(h => links.add(h));
    delete audit.hrefs;
    report.push({ url, width: w, ...audit, consoleErrors: errors, failedRequests: [...new Set(failed)] });
    await page.close();
  }
}
await browser.close();

// Check every link once. mailto/tel are validated by shape only.
const linkReport = [];
for (const h of links) {
  if (/^(mailto|tel):/.test(h)) { linkReport.push({ href: h, status: /^(mailto:[^@\s]+@[^@\s]+|tel:\+?[\d\s-]{7,})$/.test(h) ? 'ok-shape' : 'BAD-SHAPE' }); continue; }
  if (h.includes('#') && h.split('#')[0] === (base + '/').replace(/\/+$/, '/')) continue;
  try {
    let r = await fetch(h, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) verify.mjs' } });
    if (r.status >= 400 && r.status !== 404) r = await fetch(h, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) verify.mjs' } });
    linkReport.push({ href: h, status: r.status });
  } catch (e) { linkReport.push({ href: h, status: 'ERR ' + e.message }); }
}
const out = { base, report, links: linkReport };
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(out, null, 2));
for (const r of report) {
  const flags = [r.overflow > 0 && `OVERFLOW ${r.overflow}px ${r.wide.join(' | ')}`, r.consoleErrors.length && `CONSOLE ${r.consoleErrors.length}`,
    r.failedRequests.length && `FAILED ${r.failedRequests.join(' ; ')}`, r.deadAnchors.length && `DEAD-ANCHORS ${r.deadAnchors}`,
    r.imgsBroken.length && `BROKEN-IMG ${r.imgsBroken.length}`, r.invisibleAfterScroll && `INVISIBLE ${r.invisibleAfterScroll}`,
    r.h1 !== 1 && `H1=${r.h1}`].filter(Boolean);
  console.log(`${r.width}px ${r.url}  h=${r.height}  ${flags.length ? flags.join('  ') : 'clean'}`);
}
const bad = linkReport.filter(l => typeof l.status !== 'number' ? !String(l.status).startsWith('ok') : l.status >= 400);
console.log(`links: ${linkReport.length} checked, ${bad.length} bad`);
bad.forEach(b => console.log('  BAD', b.status, b.href));
