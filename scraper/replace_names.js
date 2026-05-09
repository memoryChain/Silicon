const fs = require('fs');
// 始终从备份读取，写入游戏文件，保证可重复执行
const data = JSON.parse(fs.readFileSync('./daily_events_backup.json', 'utf-8'));

const replacements = [
  // 第一批
  ['OpenAI', 'CloseAI'],
  ['谷歌', '谷弟'],
  ['Google', '谷弟'],
  ['微软', '巨硬'],
  // 第二批
  ['苹果', '草莓'],
  ['Apple', '草莓'],
  ['阿里', '阿外'],
  ['阿里巴巴', '阿外'],
  ['腾讯', '企鹅'],
  ['字节', '字跳'],
  ['字节跳动', '字跳'],
  ['百度', '千度'],
  ['Meta', '买它'],
  ['美团', '丑团'],
  ['快手', '慢手'],
  ['京东', '西京'],
  ['小红书', '小绿书'],
  ['小米', '大米'],
  ['蚂蚁', '蚂蚱'],
  // 第三批 - AI模型/产品
  ['ChatGPT', '聊CPI'],
  ['GPT', 'CPI'],       // 注意：GPT 可能出现在其他词中，需谨慎
  ['Claude', '克劳德'],
  ['Gemini', '双子星'],
  ['DeepSeek', '浅寻'],
  ['Grok', '格洛克'],
  ['Kimi', '基米'],
  ['通义千问', '万答'],
  ['千问', '万答'],
  ['通义', '万答'],
  ['Qwen', '万答'],
  ['豆包', '豆沙包'],
  ['混元', '浊元'],
  ['MiniMax', '迷你麦'],
  ['Kling', '可灵'],    // 英文名统一
  ['文心', '武心'],
  ['Sora', '索拉'],
  // 第四批
  ['火山引擎', '冰山引擎'],
  ['NVIDIA', 'AIDVIN'],
  // 补充
  ['B站', 'C站'],
  ['宇树科技', '语数科技'],
  ['钉钉', '铛铛'],
  ['OPPO', 'OPPA'],
  // ── 暂不替换，待定 ──
  // 国内
  // ['vivo', 'vivo'],
  // ['华为', '华为'],
  // ['荣耀', '荣耀'],
  // ['特斯拉', '特斯拉'],
  // ['联想', '联想'],
  // ['肯德基', '肯德基'],
  // ['爱奇艺', '爱奇艺'],
  // ['微博', '微博'],
  // ['网易', '网易'],
  // ['飞书', '飞书'],
  // ['夸克', '夸克'],
  // ['即梦', '即梦'],
  // ['可灵', '可灵'],
  // ['元宝', '元宝'],
  // ['扣子', '扣子'],
  // ['Coze', 'Coze'],
  // ['万兴科技', '万兴科技'],
  // ['科大讯飞', '科大讯飞'],
  // ['阶跃星辰', '阶跃星辰'],
  // ['爱诗科技', '爱诗科技'],
  // ['生数科技', '生数科技'],
  // ['百川', '百川'],
  // ['零一万物', '零一万物'],
  // ['月之暗面', '月之暗面'],
  // ['海螺AI', '海螺AI'],
  // ['抖音', '抖音'],
  // ['TikTok', 'TikTok'],
  // ['360', '360'],
  // 国外/通用
  // ['Discord', 'Discord'],
  // ['GitHub', 'GitHub'],
  // ['Firefox', 'Firefox'],
  // ['Opera', 'Opera'],
  // ['Chrome', 'Chrome'],
  // ['Canva', 'Canva'],
  // ['Figma', 'Figma'],
  // ['Notion', 'Notion'],
  // ['Hugging Face', 'Hugging Face'],
  // ['Perplexity', 'Perplexity'],
  // ['Midjourney', 'Midjourney'],
  // ['Suno', 'Suno'],
  // ['ElevenLabs', 'ElevenLabs'],
  // ['xAI', 'xAI'],
  // ['Mistral', 'Mistral'],
  // ['Anthropic', 'Anthropic'],
  // ['ComfyUI', 'ComfyUI'],
];

// 执行替换
let count = 0;
data.events.forEach(e => {
  replacements.forEach(([from, to]) => {
    if (e.event.includes(from)) {
      e.event = e.event.split(from).join(to);
      count++;
    }
  });
});

console.log(`替换了 ${count} 处`);
// 检查一个样本
const samples = data.events.filter(e =>
  e.event.includes('CloseAI') || e.event.includes('谷弟') || e.event.includes('巨硬')
);
samples.slice(0, 10).forEach(s => console.log(`  [${s.date}] ${s.event.substring(0, 100)}`));

fs.writeFileSync('./daily_events_game.json', JSON.stringify(data, null, 2), 'utf-8');
console.log('\n已保存到 daily_events_game.json');
console.log('原始数据 daily_events_backup.json 未修改');
