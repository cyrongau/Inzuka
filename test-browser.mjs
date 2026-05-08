import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 10000 });
  } catch(e) {
    console.error(e);
  }
  
  const html = await page.content();
  console.log('HTML CONTENT:', html.substring(0, 500) + '... ' + html.length + ' chars');
  
  // Also dump React root contents
  const rootContent = await page.$eval('#root', el => el.innerHTML).catch(() => 'no #root');
  console.log('ROOT CONTENT:', rootContent.substring(0, 500) + ' ...');
  
  await browser.close();
})();
