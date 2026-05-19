const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    const content = await page.evaluate(() => document.body.innerHTML);
    console.log('CONTENT START\n', content.substring(0, 500));
  } catch (e) {
    console.log('Nav error:', e);
  }
  await browser.close();
})();
