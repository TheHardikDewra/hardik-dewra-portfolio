// Clean portfolio captures of live work: Framer's "Made in Framer" badge and the
// floating "Edit Content" bar are hidden, appear-on-scroll effects are nudged so
// nothing is caught mid-fade, and each page is shot at desktop scroll stops plus
// one mobile frame.
//
//   node scripts/capture-work.mjs <list.json> <outDir> [--only=slug,slug] [--stops=0,900,1800]
//
// list.json: [{ "slug": "osprey", "url": "https://...", "wait": 2500 }]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CH = process.env.CHROME_BIN ||
  '/Users/hardikdewra/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const [listFile, outDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const opt = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const only = new Set((opt('only') || '').split(',').filter(Boolean));
const stops = (opt('stops') || '0,900,1800').split(',').map(Number);
const list = JSON.parse(fs.readFileSync(listFile, 'utf8')).filter(x => !only.size || only.has(x.slug));
fs.mkdirSync(outDir, { recursive: true });

const HIDE = `#__framer-badge-container,#__framer-editorbar-container,#__framer-editorbar-label,#__framer-editorbar,
  [id*="cookie" i],[class*="cookie-banner" i]{display:none!important;visibility:hidden!important}
  html{scrollbar-width:none}::-webkit-scrollbar{display:none}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CH, headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--mute-audio', '--disable-gpu'] });

async function shoot(item, { width, height, dpr, tag, stopsFor }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: width < 500, hasTouch: width < 500 });
  try {
    await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) { console.log(item.slug, tag, 'goto warning:', e.message); }
  await page.addStyleTag({ content: HIDE });
  await sleep(item.wait || 2500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  // Walk the whole page once so every in-view effect has fired, then come back.
  for (let y = 0; y < Math.min(total, 9000); y += Math.round(height * 0.8)) {
    await page.evaluate(y => window.scrollTo(0, y), y); await sleep(250);
  }
  const files = [];
  for (const y of stopsFor) {
    if (y > 0 && y > total - height) continue;
    await page.evaluate(y => window.scrollTo(0, y), y);
    await sleep(y === 0 ? 1600 : 1100);
    await page.addStyleTag({ content: HIDE });
    const f = path.join(outDir, `${item.slug}-${tag}${stopsFor.length > 1 ? '-' + y : ''}.png`);
    await page.screenshot({ path: f });
    files.push(path.basename(f));
  }
  const title = await page.title();
  await page.close();
  return { title, total, files };
}

for (const item of list) {
  try {
    const d = await shoot(item, { width: 1440, height: 900, dpr: 2, tag: 'desktop', stopsFor: stops });
    const m = item.mobile === false ? { files: [] } :
      await shoot(item, { width: 390, height: 844, dpr: 3, tag: 'mobile', stopsFor: [0] });
    console.log(`${item.slug}  "${d.title}"  h=${d.total}  ${[...d.files, ...m.files].join(' ')}`);
  } catch (e) { console.log(item.slug, 'FAILED', e.message); }
}
await browser.close();
