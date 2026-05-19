const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:3000/dj-client', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));
    const content = await page.evaluate(() => document.body.innerHTML);
    console.log('CONTENT:', content.substring(0, 500));
  } catch (e) {
    console.log('Exception:', e);
  }
  
  await browser.close();
})();
