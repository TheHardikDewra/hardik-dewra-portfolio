// Builds an inline SVG sprite from the Phosphor icons a page actually uses and
// writes it between <!-- icons:start --> and <!-- icons:end -->. Idempotent.
//
//   node scripts/inject-icons.mjs v1/index.html v2/index.html
//
// Reference icons as <svg class="icon"><use href="#i-arrow-up-right"/></svg>.
// Append --fill or --bold for other weights: #i-check-circle--fill.
import fs from 'node:fs';
import path from 'node:path';

const ICONS = path.resolve('shared/icons');
for (const file of process.argv.slice(2)) {
  let html = fs.readFileSync(file, 'utf8');
  const names = [...new Set([...html.matchAll(/href="#i-([a-z0-9-]+?)(?:--(fill|bold))?"/g)].map(m => m[1] + (m[2] ? `--${m[2]}` : '')))];
  const symbols = names.map(id => {
    const [name, weight = 'regular'] = id.split('--');
    const src = path.join(ICONS, weight, `${name}.svg`);
    if (!fs.existsSync(src)) throw new Error(`missing icon ${weight}/${name}.svg (used in ${file})`);
    const inner = fs.readFileSync(src, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="i-${id}" viewBox="0 0 256 256" fill="currentColor">${inner}</symbol>`;
  });
  const sprite = `<!-- icons:start --><svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols.join('')}</svg><!-- icons:end -->`;
  if (!/<!-- icons:start -->[\s\S]*?<!-- icons:end -->/.test(html)) throw new Error(`${file} has no icons:start/end marker`);
  html = html.replace(/<!-- icons:start -->[\s\S]*?<!-- icons:end -->/, sprite);
  fs.writeFileSync(file, html);
  console.log(`${file}: ${names.length} icons -> ${names.join(', ')}`);
}
