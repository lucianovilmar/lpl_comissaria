const puppeteer = require('C:/Users/LVS 06 Dev/OneDrive/Desktop/projetosnodejs/LPL/site-novo/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIES_PATH_TCP = path.join(__dirname, 'tcp-cookies.json');

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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const chromePath = getChromePath();
  if (!chromePath) {
    console.error('Navegador Chrome não localizado no sistema.');
    return;
  }

  console.log('Iniciando o Chrome para autenticação do portal TCP...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(120000);

    console.log('Acessando o portal TCP...');
    await page.goto('https://portal.tcp.com.br/', { waitUntil: 'domcontentloaded' });
    await sleep(5000);

    const userSelector = 'input[type="text"], input[formcontrolname="username"], input[placeholder*="CPF"]';
    const passSelector = 'input[type="password"], input[formcontrolname="password"]';
    
    await page.waitForSelector(userSelector, { timeout: 15000 });
    await page.type(userSelector, '04517103986');
    await page.type(passSelector, 'ro28031983');

    console.log('\n======================================================');
    console.log('INSTRUÇÕES:');
    console.log('1. Resolva o CAPTCHA ("Não sou um robô") na janela do Chrome.');
    console.log('2. Clique em "Entrar".');
    console.log('3. Aguarde o login e o redirecionamento automático.');
    console.log('======================================================\n');

    await page.waitForFunction(() => {
      return document.querySelector('input[type="password"]') === null || window.location.href.includes('consulta-geral') || window.location.href.includes('dashboard');
    }, { timeout: 120000 });

    console.log('Login detectado! Redirecionando para consulta de contêineres...');
    await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'domcontentloaded' });
    await sleep(6000);

    // Garantir a seleção da empresa MARFRIG no cabeçalho
    const isCompanySelected = await page.evaluate(() => {
      const header = document.querySelector('header') || document.querySelector('.header') || document.body;
      return header && (header.innerText.includes('03.853.896/0003-01') || header.innerText.includes('MARFRIG'));
    });

    if (!isCompanySelected) {
      console.log('Empresa Marfrig não selecionada no cabeçalho. Selecionando...');
      
      const companySelector = await page.evaluate(() => {
        if (document.querySelector('[angularticsaction="Abrir Seleção Empresa"]')) return '[angularticsaction="Abrir Seleção Empresa"]';
        if (document.querySelector('[angularticsaction="Abrir Seleção de Procuração"]')) return '[angularticsaction="Abrir Seleção de Procuração"]';
        return null;
      });

      if (companySelector) {
        await page.click(companySelector);
        await page.waitForSelector('input[formcontrolname="filtro"]', { timeout: 15000 });
        await page.evaluate(() => {
          const input = document.querySelector('input[formcontrolname="filtro"]');
          if (input) {
            input.value = '03.853.896/0003-01';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await sleep(3000);
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const target = elements.find(el => {
            const text = el.innerText || '';
            return text.includes('03.853.896/0003-01') && (
              el.tagName === 'LI' || 
              el.classList.contains('mat-list-item') || 
              el.classList.contains('empresa-dados') || 
              el.getAttribute('angularticsaction') === 'Procuracao Selecionada' || 
              el.getAttribute('angularticsaction') === 'Empresa Selecionada'
            );
          });
          if (target) {
            target.click();
            return;
          }
          const fallback = Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('03.853.896/0003-01'));
          if (fallback) fallback.click();
        });
        await sleep(6000);
        await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'domcontentloaded' });
        await sleep(4000);
      }
    }

    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH_TCP, JSON.stringify(cookies, null, 2));
    console.log('\nCookies de sessão e empresa salvos com sucesso em tcp-cookies.json!');

  } catch (err) {
    console.error('Erro durante a execução:', err.message);
  } finally {
    await browser.close();
  }
}

run();
