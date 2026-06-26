const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'tcp-cookies.json');

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

function loadCookies() {
  try {
    if (fs.existsSync(COOKIES_PATH)) {
      return JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading cookies:', e);
  }
  return null;
}

async function check() {
  const cookies = loadCookies();
  if (!cookies) {
    console.log('No cookies file found! Please run the search first to generate cookies.');
    return;
  }

  const chromePath = getChromePath();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1280, height: 1024 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setCookie(...cookies);

  try {
    console.log('Navigating to consulta-geral...');
    await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait 5 seconds for Angular components to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await page.screenshot({ path: 'step4-real-query.png' });
    console.log('step4-real-query.png saved.');
    
    fs.writeFileSync('step4-real-query.html', await page.content());

    // Print all frames / iframes
    const frames = page.frames();
    console.log(`Total frames on page: ${frames.length}`);
    frames.forEach((f, idx) => {
      console.log(`Frame ${idx}: Name="${f.name()}", URL="${f.url()}"`);
    });

    // Evaluate selectors on the main page
    const elementsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        id: i.id,
        className: i.className,
        placeholder: i.placeholder,
        name: i.name,
        tagName: i.tagName
      }));

      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        id: b.id,
        className: b.className
      }));

      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
        id: f.id,
        src: f.src,
        className: f.className
      }));

      return { inputs, buttons, iframes, currentUrl: window.location.href };
    });

    console.log('Current URL:', elementsInfo.currentUrl);
    console.log('Inputs found:', JSON.stringify(elementsInfo.inputs, null, 2));
    console.log('Buttons found:', JSON.stringify(elementsInfo.buttons, null, 2));
    console.log('Iframes found:', JSON.stringify(elementsInfo.iframes, null, 2));

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await browser.close();
  }
}

check();
