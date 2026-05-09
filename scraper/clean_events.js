const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./daily_events_game.json', 'utf-8'));

function shorten(text) {
  let t = text;

  // 1. 去掉【...】及其后面的全部内容
  t = t.replace(/【[^】]*】.*$/, '');

  // 2. 去掉尾部日期+浏览数 如 " 07-07 10.1K" 、 "。 07-08 9.4K"
  t = t.replace(/[。.]?\s*\d{2}-\d{2}\s+[\d.]+[Kk].*$/, '');

  // 3. 去掉尾部编号前缀如 "1.", "10.", "1、" 等（有些事件以数字编号开头）
  t = t.replace(/^\d{1,2}[.\、]\s*/, '');

  // 4. 去掉多余的空白
  t = t.replace(/\s+/g, '');

  // 5. 去掉尾部的 。 . ， ,
  t = t.replace(/[。.，,]+$/, '');

  // 6. 去掉《AI日报》相关的模板文字和后续所有内容
  t = t.replace(/[《「]AI日报[》」].*$/, '');
  t = t.replace(/[，,]?\s*聚焦开发者.*$/, '');
  t = t.replace(/[，,]?\s*助力.*$/, '');
  t = t.replace(/[，,]?\s*栏目每日.*$/, '');
  t = t.replace(/[，,]?\s*本期重点.*$/, '');

  // 7. 去掉尾部统计数据后缀
  t = t.replace(/[，,]\s*(?:准确率|推理速度|建模效率|处理效率|生成效率|识别准确率|推理效率)[提升提高降低]{0,2}\d+[%％倍].*$/, '');

  // 8. 多个事件粘在一起时，在第一个句号处截断（保留主事件）
  const firstPeriod = t.indexOf('。');
  if (firstPeriod > 8) {
    t = t.substring(0, firstPeriod);
  }

  // 9. 检测句中出现的公司名，在第二个事件开始处截断
  const companyPrefixes = [
    '企鹅', '阿外', '字跳', '千度', '丑团', '慢手', '西京', '小绿书', '大米', '蚂蚱',
    '巨硬', '谷弟', '草莓', 'CloseAI', '买它', 'AIDVIN', 'C站', 'OPPA',
    '克劳德', '浅寻', '格洛克', '基米', '万答', '豆沙包', '浊元', '迷你麦', '武心', '索拉',
    '冰山引擎', '语数科技', '铛铛', 'vivo', '华为', '荣耀', '特斯拉', '联想', '肯德基',
    '爱奇艺', '微博', '网易', '飞书', '夸克', '即梦', '可灵', '元宝', '扣子',
    '昆仑万维', '智谱', '阶跃星辰', '爱诗科技', '生数科技', '百川', '零一万物',
    '月之暗面', '海螺AI', '抖音', 'TikTok',
    'Canva', 'Figma', 'Notion', 'Perplexity', 'Midjourney', 'Suno',
    'ElevenLabs', 'xAI', 'Mistral', 'Anthropic', 'ComfyUI',
    'Lovart', 'Discord', 'GitHub', 'Firefox', 'Opera', 'Chrome',
  ];

  if (t.length > 35) {
    // 在第二个公司名出现处截断
    let earliestIdx = Infinity;
    for (const prefix of companyPrefixes) {
      // 跳过第一个字符之后出现的公司名
      const idx = t.indexOf(prefix, 6);
      if (idx > 6 && idx < earliestIdx) {
        earliestIdx = idx;
      }
    }
    if (earliestIdx < Infinity && earliestIdx < t.length / 2 + 10) {
      t = t.substring(0, earliestIdx);
    }
  }

  return t.trim();
}

let changed = 0;
data.events.forEach((e, i) => {
  const original = e.event;
  e.event = shorten(original);
  if (original !== e.event) changed++;
});

// 去重（缩短后可能有重复）
const seen = new Set();
data.events = data.events.filter(e => {
  const key = e.date + '|' + e.event;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

data.totalCount = data.events.length;

console.log(`精简了 ${changed} 条`);
console.log(`去重后: ${data.totalCount} 条\n`);

// 抽查
const idxs = [0, 30, 100, 200, 400, 600, data.events.length - 1];
idxs.forEach(i => {
  if (i < data.events.length) {
    const e = data.events[i];
    console.log(`[${e.date}] ${e.event}`);
  }
});

// 长度统计
const lens = data.events.map(e => e.event.length);
const avg = Math.round(lens.reduce((a,b)=>a+b,0)/lens.length);
console.log(`\n平均长度: ${avg} 字符，最长: ${Math.max(...lens)}`);

fs.writeFileSync('./daily_events_game.json', JSON.stringify(data, null, 2), 'utf-8');
console.log('已保存');
