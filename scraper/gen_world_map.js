const fs = require('fs');
const d3geo = require('d3-geo');
const topojson = require('topojson-client');

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/world/110m.json', 'utf-8'));
const world = topojson.feature(topo, topo.objects.countries);

const W = 2048, H = 1152;
const projection = d3geo.geoEquirectangular()
  .rotate([-105, 0]).scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.5);
const worldPath = d3geo.geoPath(projection)(world);

// ── 暗色版 ──
const dark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a1020"/>
  <g stroke="#111d30" stroke-width="0.3">
    ${Array.from({length:37},(_,i)=>`<line x1="0" y1="${i*32}" x2="${W}" y2="${i*32}"/>`).join('')}
    ${Array.from({length:65},(_,i)=>`<line x1="${i*32}" y1="0" x2="${i*32}" y2="${H}"/>`).join('')}
  </g>
  <path d="${worldPath}" fill="#141f2e" stroke="#1e3050" stroke-width="0.5"/>
  <rect x="3" y="3" width="${W-6}" height="${H-6}" fill="none" stroke="#1a2840" stroke-width="2"/>
</svg>`;

// ── 亮色版 ──
const light = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="o" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4e8f0"/><stop offset="100%" stop-color="#8abcd0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#o)"/>
  <path d="${worldPath}" fill="#e8e0c8" stroke="#bbb090" stroke-width="0.4"/>
</svg>`;

fs.writeFileSync('world_map_dark.svg', dark);
fs.writeFileSync('world_map_light.svg', light);
console.log('暗色: world_map_dark.svg | 亮色: world_map_light.svg');

// ── 导出 PNG ──
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [name, svg] of [['world_map_dark', dark], ['world_map_light', light]]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(svg);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `../assets/resources/textures/${name}.png`, type: 'png' });
    console.log(`${name}.png 已保存`);
    await page.close();
  }
  await browser.close();
})();
