// Renders shared/favicon.svg to the PNG sizes browsers still ask for
// (apple-touch-icon 180, favicon-32) and copies them into both sites.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CH = process.env.CHROME_BIN ||
  '/Users/hardikdewra/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const svg = fs.readFileSync('shared/favicon.svg', 'utf8');
const browser = await puppeteer.launch({ executablePath: CH, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const [name, size] of [['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['icon-512.png', 512]]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  const buf = await page.screenshot({ omitBackground: true, type: 'png' });
  for (const dir of ['shared', 'v1', 'v2']) fs.writeFileSync(`${dir}/${name}`, buf);
  console.log(name, size, buf.length, 'bytes');
}
await browser.close();
