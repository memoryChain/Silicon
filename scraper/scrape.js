const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://news.aibase.com/zh/daily', { waitUntil: 'networkidle' });

  const allUrls = new Set();
  let prevUrlCount = 0;
  let stallCount = 0;

  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    console.log(`\n=== 第 ${pageNo} 页 ===`);
    await page.waitForTimeout(4000);

    // 收集当前页 URL
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/zh/daily/"]');
      return Array.from(links).map(a => a.getAttribute('href'));
    });

    urls.forEach(u => allUrls.add(u));
    const newCount = allUrls.size - prevUrlCount;
    console.log(`  收集 ${urls.length} 个链接，新增 ${newCount}（累计 ${allUrls.size}）`);
    prevUrlCount = allUrls.size;

    // 检查是否真的翻页了（URL 应该有变化）
    if (pageNo > 1 && newCount === 0) {
      stallCount++;
      if (stallCount >= 2) {
        console.log('  连续两页无新数据，停止翻页');
        break;
      }
    } else {
      stallCount = 0;
    }

    if (pageNo === 10) break;

    // 翻页：使用 Element UI Vue 组件方法
    const success = await page.evaluate((targetPage) => {
      try {
        // 找到 el-pagination 的 Vue 实例
        const el = document.querySelector('.el-pagination');
        if (el && el.__vue__) {
          el.__vue__.handleCurrentChange(targetPage);
          return true;
        }
        // 备选：通过 Vue app 查找
        const nuxtEl = document.querySelector('#__nuxt');
        if (nuxtEl && nuxtEl.__vue_app__) {
          // 遍历所有元素找到 pagination 组件的 Vue 实例
          const walk = (node) => {
            if (node.__vue__ && node.__vue__.handleCurrentChange) {
              node.__vue__.handleCurrentChange(targetPage);
              return true;
            }
            for (const child of node.children) {
              if (walk(child)) return true;
            }
            return false;
          };
          if (walk(nuxtEl)) return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }, pageNo + 1);

    if (!success) {
      console.log(`  Vue 方法失败，尝试直接点击`);
      try {
        await page.locator(`.el-pager li.number >> text="${pageNo + 1}"`).click({ timeout: 3000 });
      } catch {
        try {
          await page.locator('button.btn-next').click({ timeout: 3000 });
        } catch {
          console.log('  翻页完全失败');
        }
      }
    } else {
      console.log(`  Vue handleCurrentChange(${pageNo + 1}) 成功`);
    }
  }

  console.log(`\n收集到 ${allUrls.size} 个日报 URL，开始提取标题...\n`);

  // 逐个访问提取标题
  const titles = [];
  const urlArr = Array.from(allUrls);
  let i = 0;

  for (const url of urlArr) {
    i++;
    try {
      await page.goto(`https://news.aibase.com${url}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForTimeout(1500);

      const title = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.textContent.trim() : '';
      });

      if (title && title.includes('AI日报')) {
        titles.push(title);
        console.log(`[${i}/${urlArr.length}] ✅ ${title.substring(0, 90)}`);
      } else {
        console.log(`[${i}/${urlArr.length}] ⚠ ${url} — 无标题 (${title?.substring(0, 30) || 'N/A'})`);
      }
    } catch (e) {
      console.log(`[${i}/${urlArr.length}] ❌ ${url} — ${e.message}`);
    }
  }

  await browser.close();

  const unique = [...new Set(titles)];
  console.log(`\n✅ ${unique.length} 条`);

  fs.writeFileSync(
    'f:/myworkspace/cocosProjects/Silicon/scraper/daily_titles.json',
    JSON.stringify({
      source: 'https://news.aibase.com/zh/daily',
      scrapedAt: new Date().toISOString(),
      totalCount: unique.length,
      titles: unique,
    }, null, 2),
    'utf-8',
  );
  console.log('已保存');
})();
