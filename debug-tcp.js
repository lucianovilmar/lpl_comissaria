const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getChromePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ].filter(Boolean);
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function debug() {
  const chromePath = getChromePath();
  console.log('Chrome Path:', chromePath);
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    console.log('1. Navigating to portal...');
    await page.goto('https://portal.tcp.com.br/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: 'step1-home.png' });
    console.log('Step 1 screenshot saved.');

    // Save HTML for diagnostic purposes
    const html = await page.content();
    fs.writeFileSync('step1-home.html', html);
    
    // Check if password field is visible
    const hasPassword = await page.evaluate(() => document.querySelector('input[type="password"]') !== null);
    console.log('Has password field:', hasPassword);

    if (hasPassword) {
      console.log('2. Entering credentials...');
      const userSelector = 'input[type="text"], input[formcontrolname="username"], input[placeholder*="CPF"]';
      const passSelector = 'input[type="password"], input[formcontrolname="password"]';
      
      await page.waitForSelector(userSelector, { timeout: 5000 });
      await page.type(userSelector, '04517103986');
      
      await page.waitForSelector(passSelector, { timeout: 5000 });
      await page.type(passSelector, 'ro28031983');
      
      await page.screenshot({ path: 'step2-filled.png' });
      
      console.log('3. Submitting login form...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submit = buttons.find(b => b.textContent.includes('Entrar') || b.textContent.includes('Acessar') || b.textContent.includes('Login') || b.type === 'submit');
        if (submit) submit.click();
        else {
          const form = document.querySelector('form');
          if (form) form.submit();
        }
      });
      
      console.log('Waiting for navigation...');
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      } catch(e) {
        console.log('Navigation timeout or redirect...');
      }
      
      await page.screenshot({ path: 'step3-post-login.png' });
      fs.writeFileSync('step3-post-login.html', await page.content());
    }

    console.log('4. Navigating to consulta-geral...');
    await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.screenshot({ path: 'step4-query.png' });
    fs.writeFileSync('step4-query.html', await page.content());
    
    console.log('Checking for container search input...');
    const searchInputExists = await page.evaluate(() => document.querySelector('input[type="text"]') !== null);
    console.log('Search input exists on query page:', searchInputExists);
    
  } catch (err) {
    console.error('Error during debug:', err);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

debug();
