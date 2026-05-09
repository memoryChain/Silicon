const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://news.aibase.com/zh/daily', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 查看所有链接和标题文本
  const allLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/zh/daily/"]');
    return Array.from(links).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim().substring(0, 120),
    }));
  });

  console.log('=== Daily news links ===');
  allLinks.forEach((l, i) => console.log(`${i + 1}. [${l.href}] ${l.text}`));

  // 查看翻页结构
  const pagination = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="page"], [class*="pagin"], button, .el-pager li, .el-pagination li');
    return Array.from(els).slice(0, 20).map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.textContent.trim().substring(0, 50),
    }));
  });
  console.log('\n=== Pagination elements ===');
  pagination.forEach(p => console.log(`${p.tag}.${p.class} => "${p.text}"`));

  await browser.close();
})();
