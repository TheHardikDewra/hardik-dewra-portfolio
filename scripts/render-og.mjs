// Renders each site's og.html (a 1200x630 card built with the site's own CSS and
// fonts) to og.png, so link previews use the real type instead of a fallback font.
//
//   node scripts/render-og.mjs            # both sites
//   node scripts/render-og.mjs v1         # one site
//
// og.html is served from the site folder over a throwaway local server so its
// /fonts/... URLs resolve exactly as they do in production.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CH = process.env.CHROME_BIN ||
  '/Users/hardikdewra/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const sites = process.argv.slice(2).length ? process.argv.slice(2) : ['v1', 'v2'];
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

for (const site of sites) {
  const root = path.resolve(site);
  if (!fs.existsSync(path.join(root, 'og.html'))) { console.log(site, 'no og.html, skipped'); continue; }
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: CH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}/og.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'og.png'), type: 'png' });
  await browser.close();
  server.close();
  console.log(site, '-> og.png');
}
