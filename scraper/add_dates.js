const { chromium } = require('playwright');
const fs = require('fs');

// 重新遍历列表页收集 URL + 标题，再逐个提取日期，最后拆分事件并排序

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 第一步：重新遍历 10 个列表页，收集 daily URL 和对应标题
  console.log('第一步：收集 daily URL 和标题...');

  await page.goto('https://news.aibase.com/zh/daily', { waitUntil: 'networkidle' });

  const urlTitleMap = {}; // { url: title }

  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    console.log(`  第 ${pageNo} 页`);
    await page.waitForTimeout(3000);

    const items = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/zh/daily/"]');
      return Array.from(links).map(a => ({
        url: a.getAttribute('href'),
        title: a.textContent.trim().split('欢迎来到【AI日报】')[0].trim(),
      }));
    });

    items.forEach(item => {
      if (item.title.startsWith('AI日报') && item.title.length > 10) {
        urlTitleMap[item.url] = item.title;
      }
    });

    console.log(`    收集到 ${Object.keys(urlTitleMap).length} 个映射`);

    if (pageNo === 10) break;

    // 点下一页
    try {
      await page.locator(`.el-pager li.number >> text="${pageNo + 1}"`).click({ timeout: 3000 });
    } catch {
      try {
        await page.locator('button.btn-next').click({ timeout: 3000 });
      } catch {
        console.log('    翻页失败');
      }
    }
  }

  console.log(`\n共 ${Object.keys(urlTitleMap).length} 个 daily URL`);

  // 第二步：逐个访问 daily 详情页，提取日期
  console.log('\n第二步：提取日期...');

  const urlDateMap = {}; // { url: date_string }
  const urls = Object.keys(urlTitleMap);
  let count = 0;

  for (const url of urls) {
    count++;
    try {
      await page.goto('https://news.aibase.com' + url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(800);

      const date = await page.evaluate(() => {
        // 找第一个包含日期格式的 span
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          const match = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})[号日]/);
          if (match && text.length < 20) {
            return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
          }
        }
        return null;
      });

      if (date) {
        urlDateMap[url] = date;
        if (count % 20 === 0) console.log(`  [${count}/${urls.length}] ${date} ${url}`);
      } else {
        console.log(`  [${count}/${urls.length}] ⚠ 无日期 ${url}`);
      }
    } catch (e) {
      console.log(`  [${count}/${urls.length}] ❌ ${url} — ${e.message}`);
    }
  }

  await browser.close();

  // 第三步：构建事件列表（拆分标题 + 关联日期）
  console.log('\n第三步：拆分事件并关联日期...');

  const datedEvents = [];

  for (const [url, title] of Object.entries(urlTitleMap)) {
    const date = urlDateMap[url];
    if (!date) continue;

    const content = title.replace(/^AI日报[：:]\s*/, '');
    const parts = content.split(/[；;]/);

    parts.forEach(part => {
      const event = part.trim();
      if (event.length > 3) {
        datedEvents.push({ date, event });
      }
    });
  }

  // 去重 + 按日期排序
  const seen = new Set();
  const unique = [];
  for (const item of datedEvents) {
    const key = item.date + '|' + item.event;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  unique.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`去重后: ${unique.length} 个事件`);
  console.log(`日期范围: ${unique[0]?.date} ~ ${unique[unique.length-1]?.date}`);

  fs.writeFileSync(
    'f:/myworkspace/cocosProjects/Silicon/scraper/daily_events.json',
    JSON.stringify({
      source: 'https://news.aibase.com/zh/daily',
      scrapedAt: new Date().toISOString(),
      totalCount: unique.length,
      events: unique,
    }, null, 2),
    'utf-8',
  );

  console.log('已保存到 daily_events.json');
})();
