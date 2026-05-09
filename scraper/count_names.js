const data = require('./daily_events.json');

const nameMap = {
  // 国外公司
  'OpenAI': 0, '谷歌': 0, 'Google': 0, '微软': 0, 'Microsoft': 0,
  '苹果': 0, 'Apple': 0, 'Meta': 0, 'Amazon': 0, 'NVIDIA': 0,
  'xAI': 0, 'Mistral': 0, 'Anthropic': 0, 'Stability AI': 0,
  'Adobe': 0, 'Perplexity': 0, 'Midjourney': 0, 'MidJourney': 0,
  'ElevenLabs': 0, 'Suno': 0, 'Canva': 0, 'Figma': 0,
  'Notion': 0, 'Hugging Face': 0, 'Sora': 0,
  // 国内公司
  '阿里': 0, '阿里巴巴': 0, '腾讯': 0, '字节': 0, '字节跳动': 0,
  '百度': 0, '美团': 0, '快手': 0, '京东': 0, '小红书': 0,
  '小米': 0, '蚂蚁': 0, '网易': 0, '昆仑万维': 0, '智谱': 0,
  '阶跃星辰': 0, '生数科技': 0, '爱诗科技': 0, '百川': 0,
  '零一万物': 0, '月之暗面': 0, '元石科技': 0, '美图': 0,
  '科大讯飞': 0, '万兴科技': 0, '360': 0, '火山引擎': 0,
  // AI模型/产品
  'ChatGPT': 0, 'GPT': 0, 'Claude': 0, 'DeepSeek': 0,
  'Gemini': 0, 'Grok': 0, 'Veo': 0, 'Kimi': 0,
  '通义千问': 0, '千问': 0, '通义': 0, 'Qwen': 0,
  '豆包': 0, '可灵': 0, 'Kling': 0, '混元': 0, '文心': 0,
  'MiniMax': 0, '即梦': 0, '夸克': 0, '钉钉': 0, '飞书': 0,
  'Wan': 0, 'Seedance': 0, 'PixVerse': 0, '扣子': 0,
  'Coze': 0, 'GLM': 0, 'Cursor': 0, 'Copilot': 0,
  'Vidu': 0, '灵光': 0, '元宝': 0, 'LiblibAI': 0, 'Windsurf': 0,
  'Lovart': 0, 'Runway': 0, 'Udio': 0, 'B站': 0,
  '微博': 0, '爱奇艺': 0, '抖音': 0, 'TikTok': 0,
  'Opera': 0, 'Firefox': 0, 'Chrome': 0, 'Discord': 0,
  'GitHub': 0, 'ComfyUI': 0, 'Hailuo': 0, '海螺AI': 0,
  'Freepik': 0, 'Canva': 0, 'HeyGen': 0, 'SkyReels': 0,
  'Character.AI': 0, 'Gartner': 0, 'Stripe': 0,
};

// 统计频率
const nameRegexes = Object.keys(nameMap).map(name => ({
  name,
  regex: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
}));

data.events.forEach(e => {
  nameRegexes.forEach(({ name, regex }) => {
    const matches = e.event.match(regex);
    if (matches) nameMap[name] += matches.length;
  });
});

// 排序输出
const sorted = Object.entries(nameMap)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1]);

console.log('公司/产品名（按频率排序）:\n');
sorted.forEach(([name, count], i) => {
  console.log(`${i + 1}. ${name} (${count}次)`);
});
