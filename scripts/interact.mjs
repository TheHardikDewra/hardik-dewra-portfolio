// Interaction QA: drives the real behaviours with real pointer events and
// asserts on the DOM, then saves a screenshot of each state.
//
//   node scripts/interact.mjs <v1Url> <v2Url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CH = process.env.CHROME_BIN ||
  '/Users/hardikdewra/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const [v1, v2, out = 'interact-out'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CH, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

async function open(url, w, h, mobile = false) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  await sleep(1200);
  return { page, errors };
}
async function center(page, sel) {
  return page.$eval(sel, el => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
}

// ---- v1 desktop: index preview + FAQ
{
  const { page, errors } = await open(v1, 1440, 900);
  const c = await center(page, '.row[data-preview]');
  await sleep(900);
  await page.mouse.move(c.x - 200, c.y); await sleep(100);
  await page.mouse.move(c.x, c.y, { steps: 8 }); await sleep(800);
  const pv = await page.evaluate(() => { const p = document.querySelector('.preview'); return { op: +getComputedStyle(p).opacity, src: p.querySelector('img').getAttribute('src'), want: document.querySelector('.row[data-preview]').getAttribute('data-preview') }; });
  ok('v1 index hover shows preview', pv.op > 0.9 && pv.src === pv.want, `opacity=${pv.op} src=${pv.src}`);
  await page.screenshot({ path: path.join(out, 'v1-preview.png') });
  await page.mouse.move(20, 450, { steps: 6 }); await sleep(700);
  const gone = await page.evaluate(() => +getComputedStyle(document.querySelector('.preview')).opacity);
  ok('v1 preview hides on leave', gone < 0.1, `opacity=${gone}`);
  const q = await center(page, '.faq-q'); await sleep(900);
  await page.mouse.click(q.x, q.y); await sleep(700);
  const faq = await page.evaluate(() => { const i = document.querySelector('.faq-item'); return { exp: i.querySelector('.faq-q').getAttribute('aria-expanded'), h: i.querySelector('.faq-a').getBoundingClientRect().height }; });
  ok('v1 FAQ opens', faq.exp === 'true' && faq.h > 30, `expanded=${faq.exp} h=${Math.round(faq.h)}`);
  await page.screenshot({ path: path.join(out, 'v1-faq.png') });
  ok('v1 desktop console clean', errors.length === 0, errors.join(' | '));
  await page.close();
}
// ---- v1 mobile: menu
{
  const { page, errors } = await open(v1, 390, 844, true);
  await page.tap('.menu-btn'); await sleep(800);
  const m = await page.evaluate(() => { const el = document.getElementById('menu'); const r = el.getBoundingClientRect(); return { open: el.classList.contains('is-open'), top: Math.round(r.top), inert: el.inert, links: el.querySelectorAll('a').length }; });
  ok('v1 mobile menu opens', m.open && m.top >= 60 && m.top < 80 && !m.inert, JSON.stringify(m));
  await page.screenshot({ path: path.join(out, 'v1-menu.png') });
  await page.tap('.menu a[href="#pricing"]'); await sleep(1800);
  const after = await page.evaluate(() => ({ open: document.getElementById('menu').classList.contains('is-open'), top: Math.round(document.getElementById('pricing').getBoundingClientRect().top) }));
  ok('v1 menu link closes menu and scrolls', !after.open && Math.abs(after.top - 84) < 120, JSON.stringify(after));
  ok('v1 mobile console clean', errors.length === 0, errors.join(' | '));
  await page.close();
}
// ---- v2 desktop: pins + gallery + FAQ
{
  const { page, errors } = await open(v2, 1440, 900);
  const c = await center(page, '.case .pin[data-n="3"]'); await sleep(1600);
  await page.mouse.move(c.x, c.y, { steps: 5 }); await sleep(500);
  const pin = await page.evaluate(() => ({ note: document.querySelector('.case .note[data-n="3"]').classList.contains('is-active'), pinOn: document.querySelector('.case .pin[data-n="3"]').classList.contains('is-active'), op: +getComputedStyle(document.querySelector('.case .pin[data-n="3"]')).opacity }));
  ok('v2 pin hover activates its note', pin.note && pin.pinOn && pin.op > 0.9, JSON.stringify(pin));
  await page.screenshot({ path: path.join(out, 'v2-pin.png') });
  const g0 = await page.evaluate(() => { const s = document.querySelector('.gallery-sec'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY + s.offsetHeight * 0.6); return 1; });
  await sleep(1400);
  const gx = await page.evaluate(() => getComputedStyle(document.querySelector('.track')).transform);
  ok('v2 gallery moves sideways on scroll', gx !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(gx), gx);
  await page.screenshot({ path: path.join(out, 'v2-gallery.png') });
  const q = await center(page, '.faq-q'); await sleep(900);
  await page.mouse.click(q.x, q.y); await sleep(700);
  const faq = await page.evaluate(() => document.querySelector('.faq-item .faq-q').getAttribute('aria-expanded'));
  ok('v2 FAQ opens', faq === 'true');
  ok('v2 desktop console clean', errors.length === 0, errors.join(' | '));
  await page.close();
}
// ---- v2 mobile: menu + native gallery
{
  const { page, errors } = await open(v2, 390, 844, true);
  await page.tap('.menu-btn'); await sleep(800);
  const m = await page.evaluate(() => { const el = document.getElementById('menu'); return { open: el.classList.contains('is-open'), top: Math.round(el.getBoundingClientRect().top) }; });
  ok('v2 mobile menu opens', m.open && m.top >= 56 && m.top < 76, JSON.stringify(m));
  await page.screenshot({ path: path.join(out, 'v2-menu.png') });
  await page.tap('.menu-btn'); await sleep(700);
  const nat = await page.evaluate(() => { const g = document.querySelector('.gallery'); return { native: g.classList.contains('is-native'), scrollable: g.scrollWidth > g.clientWidth, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  ok('v2 mobile gallery is a native swipe row', nat.native && nat.scrollable && nat.docOverflow <= 0, JSON.stringify(nat));
  ok('v2 mobile console clean', errors.length === 0, errors.join(' | '));
  await page.close();
}
// ---- reduced motion / static: nothing may stay hidden
for (const [name, url] of [['v1', v1], ['v2', v2]]) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' }); await sleep(800);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p,li,a,img,.pin,.hl')]
    .filter(el => { const s = getComputedStyle(el); return (s.opacity === '0' || s.visibility === 'hidden') && el.getBoundingClientRect().height > 0 && !el.closest('.menu,.preview'); }).length);
  ok(`${name} reduced motion: nothing hidden`, hidden === 0, `hidden=${hidden}`);
  await page.close();
}
await browser.close();
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
