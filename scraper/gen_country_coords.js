const fs = require('fs');
const d3geo = require('d3-geo');
const topojson = require('topojson-client');

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/world/110m.json', 'utf-8'));
const countries = topojson.feature(topo, topo.objects.countries);

const W = 2048, H = 1152;
const projection = d3geo.geoEquirectangular()
  .rotate([-105, 0]).scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(1);
const geoPath = d3geo.geoPath(projection);

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

const result = {};

for (const f of countries.features) {
  const code = idMap[String(f.id)];
  if (!code) continue;

  // 直接从 GeoJSON 提取投影后的坐标
  const coords = [];
  const geom = f.geometry;

  function extractRings(polygon) {
    const rings = [];
    for (const ring of polygon) {
      const pts = ring.map(([lon, lat]) => {
        const p = projection([lon, lat]);
        if (!p) return null;
        return [p[0] / W, p[1] / H]; // 归一化到 0-1
      }).filter(p => p !== null);
      if (pts.length > 2) rings.push(pts);
    }
    return rings;
  }

  if (geom.type === 'Polygon') {
    coords.push(...extractRings(geom.coordinates));
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      coords.push(...extractRings(poly));
    }
  }

  if (coords.length > 0) {
    result[code] = coords;
  }
}

fs.writeFileSync(
  '../assets/resources/configs/country_coords.json',
  JSON.stringify(result),
  'utf-8',
);
console.log(`${Object.keys(result).length} 个国家坐标`);
console.log('示例 CN:', result['CN'] ? result['CN'][0].slice(0, 3) : 'N/A');
