const fs = require('fs');
const d3geo = require('d3-geo');
const topojson = require('topojson-client');
const { chromium } = require('playwright');

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/world/110m.json', 'utf-8'));
const countries = topojson.feature(topo, topo.objects.countries);

const W = 512, H = 288;
const projection = d3geo.geoEquirectangular()
  .rotate([-105, 0]).scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(1);
const geoPath = d3geo.geoPath(projection);

// 国家名映射
const idMap = {
  '840':'US','156':'CN','392':'JP','410':'KR','276':'DE','826':'GB','250':'FR',
  '124':'CA','356':'IN','376':'IL','702':'SG','643':'RU','076':'BR','036':'AU',
  '528':'NL','752':'SE','756':'CH','158':'TW','784':'AE','360':'ID','380':'IT',
  '724':'ES','484':'MX','710':'ZA','704':'VN','764':'TH','458':'MY','616':'PL',
  '246':'FI','372':'IE','578':'NO','208':'DK','203':'CZ','642':'RO','804':'UA',
  '040':'AT','056':'BE','620':'PT','300':'GR','348':'HU','682':'SA','792':'TR',
  '818':'EG','566':'NG','404':'KE','504':'MA','032':'AR','152':'CL','170':'CO',
  '604':'PE','554':'NZ','586':'PK','050':'BD','608':'PH','398':'KZ','231':'ET',
  '834':'TZ','288':'GH','384':'CI','686':'SN','800':'UG','788':'TN','368':'IQ',
  '364':'IR','400':'JO','634':'QA','414':'KW','512':'OM','887':'YE','760':'SY',
  '422':'LB','729':'SD','434':'LY','012':'DZ','024':'AO','716':'ZW','894':'ZM',
  '508':'MZ','450':'MG','180':'CD','178':'CG','120':'CM','466':'ML','854':'BF',
  '562':'NE','148':'TD','860':'UZ','144':'LK','524':'NP','104':'MM','116':'KH',
  '100':'BG','688':'RS','112':'BY','862':'VE','218':'EC','858':'UY','068':'BO',
  '600':'PY','188':'CR','591':'PA','192':'CU',
};

const outDir = '../assets/resources/textures/countries/';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const shapeList = [];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const f of countries.features) {
    const code = idMap[String(f.id)];
    if (!code) continue;

    const d = geoPath(f);
    if (!d) continue;

    shapeList.push(code);

    // 生成单国白色 SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
      <path d="${d}" fill="#ffffff" fill-rule="evenodd"/>
    </svg>`;

    const page = await browser.newPage();
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(svg);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `${outDir}${code}.png`,
      type: 'png',
      omitBackground: true,
    });
    await page.close();
  }

  await browser.close();

  // 写国家列表
  fs.writeFileSync(
    outDir + 'country_list.json',
    JSON.stringify(shapeList, null, 2),
    'utf-8',
  );
  console.log(`已生成 ${shapeList.length} 个国家纹理到 ${outDir}`);
})();
