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

async function testSearch() {
  const cookies = loadCookies();
  if (!cookies) {
    console.log('No cookies file found!');
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
    
    // Wait for input#search
    console.log('Waiting for input#search...');
    await page.waitForSelector('input#search', { timeout: 15000 });
    
    console.log('Typing container code...');
    await page.type('input#search', 'MNBU0521466');
    
    console.log('Clicking Buscar...');
    await page.click('button.submit-button');
    
    console.log('Waiting 6 seconds for results...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    await page.screenshot({ path: 'search-result.png' });
    console.log('search-result.png saved.');
    
    fs.writeFileSync('search-result.html', await page.content());

    // Evaluate what is visible
    const info = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Let's find any tables or details list
      const tables = Array.from(document.querySelectorAll('table')).map(t => {
        const headers = Array.from(t.querySelectorAll('thead th, tr th')).map(h => h.textContent.trim());
        const rows = Array.from(t.querySelectorAll('tbody tr')).map(tr => 
          Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );
        return { headers, rows };
      });

      const divs = Array.from(document.querySelectorAll('div')).map(d => ({
        id: d.id,
        className: d.className,
        textLength: d.innerText.trim().length
      })).filter(d => d.className && d.className.includes('container') && d.textLength > 10);

      return { text: text.substring(0, 1000), tables, divs: divs.slice(0, 5) };
    });

    console.log('Tables found:', JSON.stringify(info.tables, null, 2));
    console.log('Visible text snippet:', info.text);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testSearch();
