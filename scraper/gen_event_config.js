const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./daily_events_game.json', 'utf-8'));

// 效果类别定义：关键词匹配 → 效果模板
// 效果类型: world(世界属性), attr(AI属性), gp(技能点)
const categories = [
  {
    name: '模型发布',
    keywords: ['发布', '开源', '上线', '推出', '公测', '预览版', '发布新', '升级', '更新'],
    effects: {
      world: { compute: [2, 8], data: [1, 5] },
      attr: { C: [2, 6] },
      gp: [0, 5],
    },
  },
  {
    name: '监管政策',
    keywords: ['监管', '法规', '禁令', '审核', '整治', '严禁', '规范', '立法', '一审', '二审', '法院', '查处', '合规', '广电', '政策', '法律'],
    effects: {
      world: { reg: [3, 12], public: [2, 8] },
      attr: { R: [-8, -2], S: [-5, 0] },
      gp: [0, 3],
    },
  },
  {
    name: '资本融资',
    keywords: ['融资', '上市', '估值', '投资', '收购', 'IPO', '美元', '亿元', '营收', '财报', '股价', '市值', '盈利'],
    effects: {
      world: { stab: [1, 5] },
      attr: { K: [3, 10] },
      gp: [2, 8],
    },
  },
  {
    name: '安全漏洞',
    keywords: ['漏洞', '攻击', '投毒', '泄露', '安全', '黑客', '病毒', '暴露', '入侵', '防御'],
    effects: {
      world: { public: [3, 10] },
      attr: { S: [-10, -3], R: [-5, 0] },
      gp: [0, 2],
    },
  },
  {
    name: '硬件基建',
    keywords: ['芯片', 'GPU', 'TPU', '眼镜', '机器人', '硬件', '基建', '5G', '6G', 'IoT', '数据中心', '服务器', '电力', '能源', '人形'],
    effects: {
      world: { infra: [2, 6], power: [1, 4] },
      attr: { P: [2, 6], E: [2, 5] },
      gp: [0, 4],
    },
  },
  {
    name: '商业应用',
    keywords: ['接入', '集成', '合作', '支付', '平台', '浏览器', '商店', '应用', 'App', '搜索', '地图', '购物', '广告', '电商', '社交', '游戏', '视频', '音乐', '播客', '漫画', '动画', '写作'],
    effects: {
      world: { data: [1, 4] },
      attr: { I: [2, 6], K: [1, 4] },
      gp: [1, 5],
    },
  },
  {
    name: '国际竞争',
    keywords: ['领先', '超越', '登顶', '第一', '冠军', '打破', '突破', '里程碑', '首次', '首个', '全球', '国际', '超越CPI', '超越聊CPI', '最优', '最强'],
    effects: {
      world: { public: [2, 6] },
      attr: { I: [3, 8], A: [1, 4] },
      gp: [3, 10],
    },
  },
  {
    name: '版权争议',
    keywords: ['版权', '著作权', '侵仅', '纠纷', '和解', '抄袭', '伪造', '深度伪造', '换脸', '冒充'],
    effects: {
      world: { reg: [2, 6], public: [3, 8] },
      attr: { R: [-6, -1], S: [-5, 0] },
      gp: [0, 2],
    },
  },
  {
    name: '裁员变动',
    keywords: ['裁员', '离职', '辞职', '组织变革', '重组', '换帅', '辞职', '调整'],
    effects: {
      world: { stab: [-5, -1] },
      attr: { K: [-5, -1], I: [-3, 1] },
      gp: [0, 3],
    },
  },
];

// 默认兜底效果（匹配不到任何分类时）
const defaultEffects = {
  world: { data: [1, 3] },
  attr: { I: [1, 3] },
  gp: [0, 3],
};

// 辅助：生成范围内的随机整数
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 辅助：应用效果模板生成具体数值
function applyTemplate(template) {
  const result = { world: {}, attr: {}, gp: 0 };
  if (template.world) {
    for (const [key, range] of Object.entries(template.world)) {
      result.world[key] = randInt(range[0], range[1]);
    }
  }
  if (template.attr) {
    for (const [key, range] of Object.entries(template.attr)) {
      result.attr[key] = randInt(range[0], range[1]);
    }
  }
  if (template.gp) {
    result.gp = randInt(template.gp[0], template.gp[1]);
  }
  return result;
}

// 分类匹配
function categorize(eventText) {
  const scores = [];
  for (const cat of categories) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (eventText.includes(kw)) score++;
    }
    scores.push({ cat, score });
  }
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score > 0) return scores[0].cat;
  return null; // 无匹配，使用默认
}

// 生成配置
const eventConfigs = [];
const stats = {};

for (const item of data.events) {
  const cat = categorize(item.event);
  const catName = cat ? cat.name : '其他';
  stats[catName] = (stats[catName] || 0) + 1;

  const template = cat ? cat.effects : defaultEffects;
  const effects = applyTemplate(template);

  // 确保世界属性变化在 -15 ~ +15 之间，AI 属性在 -10 ~ +10
  for (const [key, val] of Object.entries(effects.world)) {
    effects.world[key] = Math.max(-15, Math.min(15, val));
  }
  for (const [key, val] of Object.entries(effects.attr)) {
    effects.attr[key] = Math.max(-10, Math.min(10, val));
  }

  eventConfigs.push({
    id: 'evt_' + eventConfigs.length,
    date: item.date,
    title: item.event,
    category: catName,
    effects,
  });
}

// 输出统计
console.log('事件分类统计:');
for (const [name, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count} 条`);
}
console.log(`  总计: ${eventConfigs.length} 条`);

// 抽样展示
console.log('\n抽样:');
const samples = [0, 50, 100, 200, 400, 600, 762];
samples.forEach(i => {
  if (i < eventConfigs.length) {
    const e = eventConfigs[i];
    console.log(`  [${e.date}] ${e.category} | ${e.title.substring(0, 40)} | GP:${e.effects.gp} W:${JSON.stringify(e.effects.world)} A:${JSON.stringify(e.effects.attr)}`);
  }
});

fs.writeFileSync(
  'f:/myworkspace/cocosProjects/Silicon/assets/resources/configs/event_config.json',
  JSON.stringify({ events: eventConfigs }, null, 2),
  'utf-8',
);
console.log('\n已保存到 assets/resources/configs/event_config.json');
