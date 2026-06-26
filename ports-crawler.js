const fs = require('fs');
const path = require('path');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer-core');
  } catch (err) {}
}

const COOKIES_PATH_TCP = path.join(__dirname, 'tcp-cookies.json');
const COOKIES_PATH_POA = path.join(__dirname, 'poa-cookies.json');
const COOKIES_PATH_NAV = path.join(__dirname, 'nav-cookies.json');
const COOKIES_PATH_TEC = path.join(__dirname, 'tec-cookies.json');

// Variáveis globais para reutilizar a instância do navegador TCP (Paranaguá)
let activeBrowserTCP = null;
let activePageTCP = null;
let tcpIdleTimer = null;

function resetTcpIdleTimer() {
  if (tcpIdleTimer) {
    clearTimeout(tcpIdleTimer);
  }
  tcpIdleTimer = setTimeout(async () => {
    if (activeBrowserTCP) {
      console.log('TCP: Fechando navegador por inatividade de 2 minutos...');
      try {
        await activeBrowserTCP.close();
      } catch (e) {}
      activeBrowserTCP = null;
      activePageTCP = null;
    }
  }, 120000); // 2 minutos de inatividade
}

// Helper to find Google Chrome path on Windows and Linux (Render)
function getChromePath() {
  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ].filter(Boolean);
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  } else {
    // Linux/Render paths
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/app/.apt/usr/bin/google-chrome',
      '/app/.apt/usr/bin/google-chrome-stable',
      '/app/.chrome-linux/chrome-linux/chrome'
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
    try {
      const { execSync } = require('child_process');
      const pathCmd = execSync('which google-chrome || which google-chrome-stable || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
      if (pathCmd && fs.existsSync(pathCmd)) {
        return pathCmd;
      }
    } catch (e) {}
    
    return null; // Let Puppeteer handle finding/downloading the browser on non-Windows platforms
  }
}

function saveCookies(cookies, filePath) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  } catch (e) {
    console.error('Error saving cookies:', e);
  }
}

function loadCookies(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

// Scraper function for TCP (Terminal de Contêineres de Paranaguá)
async function queryTCP(containerCode) {
  if (containerCode === 'LPLTEST1234') {
    return {
      api: 'TCP',
      container: 'LPLTEST1234',
      status: 'Importação Liberada',
      weight: '22.400 kg',
      type: '40HC',
      vessel: 'MSC VALERIA / 241A',
      booking: 'BKG-TCP-98765',
      location: 'Pátio Principal - Quadra B2',
      timeScraped: new Date().toLocaleTimeString('pt-BR'),
      history: [
        { event: 'Gate In (Entrada no terminal)', date: '2026-06-24 08:30' },
        { event: 'Liberação Receita Federal', date: '2026-06-24 14:15' },
        { event: 'Pronto para Retirada', date: '2026-06-25 09:00' }
      ]
    };
  }

  if (!puppeteer) {
    return { error: 'erro api', message: 'Módulo de automação indisponível. Instale as dependências.' };
  }

  const chromePath = getChromePath();

  // Cancelar temporizador de fechamento por inatividade
  if (tcpIdleTimer) {
    clearTimeout(tcpIdleTimer);
    tcpIdleTimer = null;
  }

  let browser = null;
  let page = null;
  const isReused = false;

  try {
    if (true) {
      const savedCookies = loadCookies(COOKIES_PATH_TCP);
      let shouldRunVisibleLogin = false;

      console.log('TCP: Abrindo nova instância do navegador...');
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      };
      if (chromePath) {
        launchOptions.executablePath = chromePath;
      }
      browser = await puppeteer.launch(launchOptions);

      page = await browser.newPage();
      
      // Evasão de detecção headless (Bypass WAF/Imperva anti-bot)
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = {
          app: {
            isInstalled: false,
            InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
            RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
          },
          runtime: {}
        };
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      page.setDefaultTimeout(120000);

      try {
        console.log('TCP: Navegando para página inicial para estabelecer sessão WAF...');
        await page.goto('https://portal.tcp.com.br/', { waitUntil: 'domcontentloaded' });

        if (savedCookies) {
          // Filtrar cookies do WAF Imperva (incap_ses, visid_incap, nlbi) para não sobrescrever os cookies válidos
          // gerados localmente pelo IP da própria instância do Render durante a navegação na Home
          const filteredCookies = savedCookies.filter(c => 
            !c.name.startsWith('incap_ses') && 
            !c.name.startsWith('visid_incap') && 
            !c.name.startsWith('nlbi')
          );
          await page.setCookie(...filteredCookies);
          console.log('TCP: Cookies de sessão aplicados (filtrando cookies do WAF).');
        }

        console.log('TCP: Navegando de forma invisível para área de consulta...');
        await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'domcontentloaded' });

        console.log('TCP: Aguardando carregamento da página ou redirecionamento de login...');
        let resolvedSelector = null;
        for (let i = 0; i < 60; i++) {
          resolvedSelector = await page.evaluate(() => {
            if (document.querySelector('input#search')) return 'search';
            if (document.querySelector('input[type="password"]')) return 'login';
            return null;
          });
          if (resolvedSelector) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!resolvedSelector) {
          throw new Error('Timeout aguardando carregamento da página de consulta');
        }

        if (resolvedSelector === 'login') {
          throw new Error('Sessão expirada ou redirecionado para login');
        }

        console.log('TCP: Autenticação silenciosa bem sucedida!');
      } catch (gotoErr) {
        console.log('TCP: Falha na autenticação silenciosa (headless):', gotoErr.message);
        try {
          // Apenas deleta o arquivo de cookies se a sessão tiver expirado de fato (redirecionado para login)
          // Evita deletar os cookies se for apenas um timeout de rede ou lentidão temporária
          if (gotoErr.message.includes('Sessão expirada') && fs.existsSync(COOKIES_PATH_TCP)) {
            fs.unlinkSync(COOKIES_PATH_TCP);
            console.log('TCP: Cookies limpos devido a sessão expirada.');
          }
        } catch (delErr) {}
        shouldRunVisibleLogin = true;
      }

      // Se falhar de forma invisível (anti-bot bloqueando), abre janela visível para intervenção e login único
      if (shouldRunVisibleLogin) {
        if (process.platform !== 'win32') {
          console.log('TCP: Cookies expirados em ambiente sem interface gráfica (Linux). Por favor, use o Bookmarklet de sincronização.');
          throw new Error('Sessão expirada. Use o Sincronizador de 1 Clique no seu navegador para atualizar os cookies.');
        }

        console.log('TCP: Abrindo navegador visível para autenticação e reCAPTCHA...');
        await browser.close();

        const launchOptionsHeadful = {
          headless: false,
          defaultViewport: { width: 1280, height: 800 },
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        };
        if (chromePath) {
          launchOptionsHeadful.executablePath = chromePath;
        }
        browser = await puppeteer.launch(launchOptionsHeadful);

        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        page.setDefaultTimeout(120000);

        await page.goto('https://portal.tcp.com.br/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const userSelector = 'input[type="text"], input[formcontrolname="username"], input[placeholder*="CPF"]';
        const passSelector = 'input[type="password"], input[formcontrolname="password"]';
        
        await page.waitForSelector(userSelector, { timeout: 10000 });
        await page.type(userSelector, '04517103986');
        
        await page.waitForSelector(passSelector, { timeout: 10000 });
        await page.type(passSelector, 'ro28031983');

        console.log('TCP: Aguardando usuário resolver o reCAPTCHA e clicar em Entrar...');
        
        try {
          await page.waitForFunction(() => {
            return document.querySelector('input[type="password"]') === null || window.location.href.includes('consulta-geral') || window.location.href.includes('dashboard');
          }, { timeout: 120000 });
        } catch (e) {
          await browser.close();
          return { error: 'erro login', message: 'Login ou CAPTCHA não resolvido na janela aberta.' };
        }

        const cookies = await page.cookies();
        saveCookies(cookies, COOKIES_PATH_TCP);
        console.log('TCP: Novos cookies de sessão salvos!');

        await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'domcontentloaded', timeout: 30000 });
      }

      // Aguardar a renderização inicial dos bindings do Angular
      console.log('TCP: Aguardando estabilização dos bindings do Angular (3s)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Garantir a seleção da empresa MARFRIG no cabeçalho
      const isCompanySelected = await page.evaluate(() => {
        const header = document.querySelector('header') || document.querySelector('.header') || document.querySelector('.navbar');
        if (!header) return false;
        const text = header.textContent || '';
        return text.includes('03.853.896/0003-01') || text.includes('MARFRIG');
      });

      if (!isCompanySelected) {
        console.log('TCP: Selecionando MARFRIG CNPJ 03.853.896/0003-01 no cabeçalho...');
        try {
          const combinedSelector = '[angularticsaction="Abrir Seleção Empresa"], [angularticsaction="Abrir Seleção de Procuração"]';
          const exists = await page.evaluate((sel) => document.querySelector(sel) !== null, combinedSelector);
          if (!exists) {
            throw new Error('Botão de seleção de empresa/procuração não localizado no cabeçalho.');
          }

          const companySelector = await page.evaluate(() => {
            if (document.querySelector('[angularticsaction="Abrir Seleção Empresa"]')) return '[angularticsaction="Abrir Seleção Empresa"]';
            if (document.querySelector('[angularticsaction="Abrir Seleção de Procuração"]')) return '[angularticsaction="Abrir Seleção de Procuração"]';
            return null;
          });

          if (!companySelector) {
            throw new Error('Botão de seleção de empresa/procuração não localizado no cabeçalho.');
          }

          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.click();
          }, companySelector);
          
          await new Promise(resolve => setTimeout(resolve, 3000)); // wait for modal animation
          
          const filterExists = await page.evaluate(() => document.querySelector('input[formcontrolname="filtro"]') !== null);
          if (!filterExists) {
            throw new Error('Campo de filtro não apareceu no modal de empresas.');
          }
          await page.evaluate(() => {
            const input = document.querySelector('input[formcontrolname="filtro"]');
            if (input) {
              input.value = '03.853.896/0003-01';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await page.evaluate(() => {
            const selectors = [
              'li',
              '.mat-list-item',
              '.empresa-dados',
              '[angularticsaction="Procuracao Selecionada"]',
              '[angularticsaction="Empresa Selecionada"]',
              'span'
            ];
            const elements = Array.from(document.querySelectorAll(selectors.join(',')));
            const target = elements.find(el => {
              const text = el.textContent || '';
              return text.includes('03.853.896/0003-01');
            });
            if (target) {
              target.click();
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const cookies = await page.cookies();
          saveCookies(cookies, COOKIES_PATH_TCP);
          console.log('TCP: Cookies atualizados após seleção de empresa.');
        } catch (selErr) {
          console.error('TCP: Erro ao selecionar empresa no cabeçalho:', selErr.message);
        }
      }

    }

    const searchInputSelector = 'input#search';
    const searchExists = await page.evaluate((sel) => document.querySelector(sel) !== null, searchInputSelector);
    if (!searchExists) {
      throw new Error('Campo de busca input#search não localizado na página.');
    }
    
    console.log('TCP: Preenchendo campo de busca com ' + containerCode + '...');
    await page.evaluate((sel, code) => {
      const input = document.querySelector(sel);
      if (input) {
        input.value = code;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = document.querySelector('button.submit-button');
      if (btn) btn.click();
    }, searchInputSelector, containerCode);
    console.log('TCP: Botão de busca clicado, aguardando 6 segundos por resultados...');

    // Esperar resultados carregarem sem fazer polling excessivo
    await new Promise(resolve => setTimeout(resolve, 6000));

    let hasResults = false;
    try {
      const state = await page.evaluate(() => {
        const mainContent = document.querySelector('app-conteiner-consulta-geral') || document.querySelector('main') || document.body;
        const text = mainContent ? (mainContent.textContent || '') : '';
        const sideTable = document.querySelector('app-conteiner-side-table');
        const hasContainer = sideTable && sideTable.querySelector('a') !== null;
        return { finished: hasContainer || text.includes('Não encontrado') || text.includes('Não foi possível encontrar'), success: hasContainer };
      });
      hasResults = state.success;
    } catch (e) {
      console.log('TCP: Erro ao verificar resultados do contêiner ' + containerCode);
    }

    console.log('TCP: Resultados localizados? ' + hasResults);
    if (!hasResults) {
      // Agenda o temporizador de fechamento por inatividade e retorna null
      resetTcpIdleTimer();
      return null;
    }

    // Clicar no link do contêiner na tabela lateral para exibir os detalhes
    console.log('TCP: Clicando no contêiner na tabela lateral...');
    await page.evaluate(() => {
      const el = document.querySelector('app-conteiner-side-table a');
      if (el) el.click();
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Garantir que as abas de detalhes carregaram
    try {
      const tabsExists = await page.evaluate(() => document.querySelector('.mat-tab-label, [role="tab"]') !== null);
      if (!tabsExists) {
        console.log('TCP: Abas não localizadas na página de detalhes.');
      }
    } catch (e) {
      console.log('TCP: Erro ao verificar abas de detalhes.');
    }

    // 1. Extrair Stepper de Progresso (Entrada, Aduaneiro, Embarque, Faturamento)
    const stepperData = await page.evaluate(() => {
      const steps = {};
      const labels = ['Entrada', 'Aduaneiro', 'Embarque', 'Faturamento'];
      
      const candidateElements = Array.from(document.querySelectorAll('span, div, p, td, th, mat-step, .mat-step'));
      labels.forEach(label => {
        const el = candidateElements.find(e => e.childNodes.length === 1 && e.textContent.trim() === label);
        if (el) {
          let date = '-';
          let state = 'pending'; // 'completed', 'active', 'pending'
          
          const parent = el.parentElement;
          if (parent) {
            const text = parent.textContent || '';
            const dateMatch = text.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
            if (dateMatch) {
              date = dateMatch[1];
            } else {
              const sibling = el.nextElementSibling;
              if (sibling) {
                const dateMatch2 = sibling.textContent.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
                if (dateMatch2) date = dateMatch2[1];
              }
            }
            
            if (text.toLowerCase().includes('done')) {
              state = 'completed';
            } else if (date !== '-') {
              state = 'active';
            }
          }
          steps[label] = { date, state };
        } else {
          steps[label] = { date: '-', state: 'pending' };
        }
      });
      return steps;
    });

    // 2. Extrair Aba: Situação (Default ativa)
    const situacaoData = await page.evaluate(() => {
      const data = {};
      const dts = Array.from(document.querySelectorAll('dl dt, .title-desc-list dt'));
      dts.forEach(dt => {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') {
          data[dt.innerText.trim()] = dd.innerText.trim();
        }
      });
      return data;
    });

    // 3. Extrair Aba: Detalhes
    console.log('TCP: Navegando para aba Detalhes...');
    const clickDetalhes = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-tab-label, .mat-tab-link, [role="tab"]'));
      const target = tabs.find(t => t.innerText.includes('Detalhes'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (clickDetalhes) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const detalhesData = await page.evaluate(() => {
      const kvs = {};
      const dts = Array.from(document.querySelectorAll('dl dt, .title-desc-list dt'));
      dts.forEach(dt => {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') {
          kvs[dt.innerText.trim()] = dd.innerText.trim();
        }
      });

      const documentos = [];
      const table = document.querySelector('table, .mat-table');
      if (table) {
        const headers = Array.from(table.querySelectorAll('th, .mat-header-cell')).map(th => th.innerText.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr, .mat-row'));
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, .mat-cell')).map(td => td.innerText.trim());
          if (cells.length > 0) {
            const doc = {};
            headers.forEach((h, idx) => {
              if (h) doc[h] = cells[idx] || '';
            });
            documentos.push(doc);
          }
        });
      }
      return { kvs, documentos };
    });

    // 4. Extrair Aba: Agendamento
    console.log('TCP: Navegando para aba Agendamento...');
    const clickAgendamento = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-tab-label, .mat-tab-link, [role="tab"]'));
      const target = tabs.find(t => t.innerText.includes('Agendamento'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (clickAgendamento) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const agendamentoData = await page.evaluate(() => {
      const kvs = {};
      const dts = Array.from(document.querySelectorAll('dl dt, .title-desc-list dt'));
      dts.forEach(dt => {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') {
          kvs[dt.innerText.trim()] = dd.innerText.trim();
        }
      });

      const timeline = {};
      const timelineLabels = ['Agendamento', 'SAV', 'Entrada Gate', 'Operação', 'Saída Gate'];
      const candidateElements = Array.from(document.querySelectorAll('span, div, p, td, th'));
      timelineLabels.forEach(label => {
        const el = candidateElements.find(e => e.childNodes.length === 1 && e.textContent.trim() === label);
        if (el) {
          let date = '-';
          let parent = el.parentElement;
          if (parent) {
            const parentText = parent.textContent || '';
            const dateMatch = parentText.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
            if (dateMatch) {
              date = dateMatch[1];
            } else {
              const sibling = el.nextElementSibling;
              if (sibling) {
                const dateMatch2 = sibling.textContent.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
                if (dateMatch2) date = dateMatch2[1];
              }
            }
          }
          timeline[label] = date;
        } else {
          timeline[label] = '-';
        }
      });
      return { kvs, timeline };
    });

    // Resetar para a aba Situação para a próxima consulta
    try {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.mat-tab-label, .mat-tab-link, [role="tab"]'));
        const target = tabs.find(t => t.innerText.includes('Situação'));
        if (target) target.click();
      });
    } catch (e) {}

    if (browser) {
      try { await browser.close(); } catch(e) {}
    }

    return {
      api: 'TCP',
      container: containerCode,
      status: situacaoData['Status'] || situacaoData['Situação'] || 'Em processamento',
      weight: detalhesData.kvs['Peso Bruto'] || detalhesData.kvs['Peso'] || 'N/A',
      type: detalhesData.kvs['Tipo'] || detalhesData.kvs['ISO'] || 'N/A',
      vessel: situacaoData['Navio / Viagem'] || situacaoData['Navio'] || 'N/A',
      booking: detalhesData.kvs['Booking'] || detalhesData.kvs['Reserva'] || 'N/A',
      location: situacaoData['Localização'] || situacaoData['Pátio'] || 'Pátio',
      timeScraped: new Date().toLocaleTimeString('pt-BR'),
      history: [],
      // Detalhes extras
      isDetailed: true,
      stepper: stepperData,
      situacao: situacaoData,
      detalhes: detalhesData,
      agendamento: agendamentoData
    };

  } catch (error) {
    console.error('Error scraping TCP:', error);
    // Se ocorrer erro crítico na janela reutilizada, fecha e reseta tudo
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    activeBrowserTCP = null;
    activePageTCP = null;
    return { error: 'erro api', message: 'Erro na API do terminal (Timeout ou falha de conexão)' };
  }
}

// Scraper function for Porto Itapoá
async function queryPOA(containerCode, bookingCode) {
  if (containerCode === 'LPLTEST1234') {
    return {
      api: 'POA',
      container: 'LPLTEST1234',
      status: 'Liberado',
      weight: '26.000 kg',
      type: '45R1',
      vessel: 'VIPIN346N',
      booking: '3AIBAK28WQ',
      location: 'DEPARTED',
      timeScraped: new Date().toLocaleTimeString('pt-BR'),
      history: [
        { event: 'Data Chegada', date: '13/11/2023 13:12' },
        { event: 'Data Saída', date: '19/11/2023 02:39' }
      ]
    };
  }

  let finalBookingCode = bookingCode;
  let finalContainerCode = containerCode;

  const isContainer = /^[A-Z]{4}[0-9]{6,7}$/i.test(containerCode.trim());
  if (!finalBookingCode) {
    if (!isContainer) {
      // Se não parece com o formato de contêiner, assumimos que o usuário digitou o próprio Booking diretamente
      finalBookingCode = containerCode;
      finalContainerCode = '';
    } else {
      // É contêiner, mas sem Booking associado
      return { error: 'erro api', message: 'Booking não localizado na planilha de processos' };
    }
  }

  if (!puppeteer) {
    return { error: 'erro api', message: 'Módulo de automação indisponível.' };
  }

  const chromePath = getChromePath();

  let browser;
  try {
    const savedCookies = loadCookies(COOKIES_PATH_POA);
    const launchOptions = {
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage'
      ]
    };
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    if (savedCookies) {
      await page.setCookie(...savedCookies);
    }

    // Ir para dashboard
    await page.goto('https://clientes.portoitapoa.com/#/dashboard', { waitUntil: 'networkidle2', timeout: 25000 });

    const needsLogin = await page.evaluate(() => {
      return document.querySelector('input[placeholder="Usuário"]') !== null || window.location.href.includes('/login');
    });

    if (needsLogin) {
      console.log('Itapoá: Efetuando login...');
      await page.goto('https://clientes.portoitapoa.com/#/login', { waitUntil: 'networkidle2', timeout: 25000 });
      await page.waitForSelector('input[placeholder="Usuário"]', { timeout: 15000 });
      await page.type('input[placeholder="Usuário"]', 'd.lpl-comis.rodrigos');
      await page.type('input[placeholder="Senha"]', 'LPL@2021');
      await page.click('button#kt_submit');
      await page.waitForSelector('.kt-header__topbar-username', { timeout: 20000 });
      
      const cookies = await page.cookies();
      saveCookies(cookies, COOKIES_PATH_POA);
    }

    // Expandir menu Consultas
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('.kt-menu__link, span')).find(e => e.innerText && e.innerText.trim() === 'Consultas');
      if (el) el.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navegar para Booking
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.innerText && a.innerText.trim() === 'Booking' && a.href.includes('consultas/booking'));
      if (link) link.click();
    });

    await page.waitForSelector('input[type="text"]', { timeout: 15000 });

    // Preencher campo com booking
    await page.evaluate(() => {
      const inp = document.querySelector('input[type="text"]');
      if (inp) inp.value = '';
    });
    await page.type('input[type="text"]', finalBookingCode);

    // Clicar em Buscar
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Buscar');
      if (btn) btn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 8000));

    const result = await page.evaluate((code, booking) => {
      const text = document.body.innerText;
      if (text.includes('Nenhum registro') || text.includes('Não encontrado')) {
        return null;
      }

      const table = document.querySelector('table');
      if (table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        // Se temos um contêiner específico para buscar, filtramos por ele. Se for busca geral por Booking, pegamos a primeira linha.
        const containerRow = code ? rows.find(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.length > 0 && cells[0].innerText.trim().toUpperCase() === code.toUpperCase();
        }) : rows[0];

        if (containerRow) {
          const cells = Array.from(containerRow.querySelectorAll('td')).map(td => td.innerText.trim());
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = cells[idx] || '';
          });

          const history = [];
          if (obj['Entrada']) history.push({ event: 'Data Chegada', date: obj['Entrada'] });
          if (obj['Saída']) history.push({ event: 'Data Saída', date: obj['Saída'] });

          return {
            container: code || cells[0] || 'N/A',
            status: obj['Despacho Liberado'] === 'SIM' ? 'Liberado' : 'Aguardando liberação',
            weight: obj['Peso Kg'] ? `${obj['Peso Kg']} kg` : 'N/A',
            type: obj['ISO'] || 'N/A',
            vessel: obj['Navio do contêiner'] || 'N/A',
            booking: booking || 'N/A',
            location: obj['Situação'] || 'Pátio',
            history
          };
        }
      }

      return null;
    }, finalContainerCode, finalBookingCode);

    await browser.close();

    if (!result) return null;

    return {
      api: 'POA',
      ...result,
      timeScraped: new Date().toLocaleTimeString('pt-BR')
    };

  } catch (error) {
    console.error('Error scraping POA:', error);
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    return { error: 'erro api', message: 'Erro na API do terminal Itapoá' };
  }
}

// Scraper function for Portonave
async function queryNAV(containerCode) {
  if (containerCode === 'LPLTEST1234') {
    return {
      api: 'NAV',
      container: 'LPLTEST1234',
      status: 'Importação',
      weight: 'N/A',
      type: 'N/A',
      vessel: 'N/A',
      booking: 'BKG-NAV-54321',
      location: 'Pátio',
      timeScraped: new Date().toLocaleTimeString('pt-BR'),
      history: [
        { event: 'Data Entrada', date: '2026-06-25 09:30' }
      ]
    };
  }

  if (!puppeteer) {
    return { error: 'erro api', message: 'Módulo de automação indisponível.' };
  }

  const chromePath = getChromePath();

  let browser;
  try {
    const savedCookies = loadCookies(COOKIES_PATH_NAV);
    const launchOptions = {
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage'
      ]
    };
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    if (savedCookies) {
      await page.setCookie(...savedCookies);
    }

    await page.goto('https://extranet.portonave.com.br/inicio/', { waitUntil: 'networkidle2', timeout: 25000 });

    const needsLogin = await page.evaluate(() => {
      return document.querySelector('input#username') !== null || window.location.href.includes('/auth/');
    });

    if (needsLogin) {
      console.log('Portonave: Efetuando login...');
      await page.goto('https://extranet.portonave.com.br/guia-entrada/', { waitUntil: 'networkidle2', timeout: 25000 });
      await page.waitForSelector('input#username', { timeout: 15000 });
      await page.type('input#username', '00483738930');
      await page.type('input#password', 'Lpl01020304!');
      await page.click('input#kc-login');
      
      // Esperar perfil
      await page.waitForSelector('.v2-profile-card', { timeout: 15000 });
      
      // Clicar Despachante
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.trim().includes('Despachante'));
        if (el) el.click();
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clicar no card do perfil específico: LPL ITJ (DESPACHANTE) - 03003269000110
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.v2-profile-card'));
        const targetCard = cards.find(card => {
          const txt = card.innerText || '';
          return txt.includes('03003269000110') || txt.includes('LPL ITJ');
        });
        if (targetCard) {
          targetCard.click();
        } else if (cards.length > 0) {
          cards[0].click(); // fallback
        }
      });
      
      await page.waitForSelector('.user-block-name', { timeout: 20000 });

      const cookies = await page.cookies();
      saveCookies(cookies, COOKIES_PATH_NAV);
    }

    // Ir para Acompanhamento Contêiner
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.innerText && a.innerText.trim().includes('Acompanhamento Contêiner'));
      if (link) link.click();
    });

    await page.waitForSelector('input#numeroContainer', { timeout: 15000 });
    await page.type('input#numeroContainer', containerCode);
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 6000));

    const result = await page.evaluate((code) => {
      const text = document.body.innerText;
      if (text.includes('Nenhum registro encontrado') || text.includes('Não encontrado')) {
        return null;
      }

      const table = document.querySelector('table');
      if (!table) return null;

      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
      const dataRows = Array.from(table.querySelectorAll('tbody tr'));
      if (dataRows.length === 0) return null;

      const parsedRows = dataRows.map(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = cells[idx] || '';
        });
        return obj;
      });

      const first = parsedRows[0];
      const history = parsedRows.map(r => ({
        event: `${r['Fluxo']} - Doc: ${r['Nro. Documento']}`,
        date: r['Data Entrada'] || 'N/A'
      }));

      return {
        container: code,
        status: first['Fluxo'] || 'No pátio',
        weight: 'N/A',
        type: 'N/A',
        vessel: 'N/A',
        booking: first['Ref. Ordem'] || 'N/A',
        location: 'Pátio',
        history
      };
    }, containerCode);

    await browser.close();

    if (!result) return null;

    return {
      api: 'NAV',
      ...result,
      timeScraped: new Date().toLocaleTimeString('pt-BR')
    };

  } catch (error) {
    console.error('Error scraping NAV:', error);
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    return { error: 'erro api', message: 'Erro na API do terminal Portonave' };
  }
}

// Scraper function for Teconline
async function queryTEC(containerCode) {
  if (containerCode === 'LPLTEST1234') {
    return {
      api: 'TEC',
      container: 'LPLTEST1234',
      status: 'No pátio',
      weight: 'N/A',
      type: 'N/A',
      vessel: 'N/A',
      booking: 'BKG-TEC-1111',
      location: 'Terminal',
      timeScraped: new Date().toLocaleTimeString('pt-BR'),
      history: [
        { event: 'Entrada Portaria', date: '2026-06-25 11:20' }
      ]
    };
  }

  if (!puppeteer) {
    return { error: 'erro api', message: 'Módulo de automação indisponível.' };
  }

  const chromePath = getChromePath();

  let browser;
  let page;
  let shouldRunVisibleLogin = false;

  try {
    const savedCookies = loadCookies(COOKIES_PATH_TEC);
    
    const launchOptions = {
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage'
      ]
    };
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    browser = await puppeteer.launch(launchOptions);

    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    if (savedCookies) {
      await page.setCookie(...savedCookies);
    }

    try {
      console.log('Teconline: Navegando...');
      await page.goto('https://teconline.com.br/containers', { waitUntil: 'networkidle2', timeout: 25000 });
      const needsLogin = await page.evaluate(() => {
        return document.querySelector('input[type="password"]') !== null || window.location.href.includes('/login');
      });
      if (needsLogin) {
        throw new Error('Sessão expirada');
      }
    } catch (gotoErr) {
      shouldRunVisibleLogin = true;
    }

    if (shouldRunVisibleLogin) {
      console.log('Teconline: Sessão expirada ou inexistente. Iniciando login automático (Headless)...');
      let autoSuccess = false;
      try {
        await page.goto('https://teconline.com.br/login#redirect=/containers', { waitUntil: 'networkidle2', timeout: 35000 });
        
        await page.waitForSelector('input[type="text"]', { timeout: 15000 });
        
        // Digitar credenciais nativamente
        await page.click('input[type="text"]');
        await page.type('input[type="text"]', 'WSLPLL');
        
        await page.click('input[type="password"]');
        await page.type('input[type="password"]', 'IU9POE4');
        
        await page.click('button[type="submit"]');
        
        // Aguardar tela de escolha de MFA
        await page.waitForFunction(() => {
          return document.body.innerText.includes('Escolha uma das opções') || document.body.innerText.includes('Palavra Chave');
        }, { timeout: 15000 });
        
        // Selecionar Palavra Chave
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Palavra Chave') && b.offsetParent !== null);
          if (btn) btn.click();
        });
        
        // Aguardar tela de digitação de palavra-chave
        await page.waitForFunction(() => {
          return document.body.innerText.includes('Use sua palavra-chave') || document.body.innerText.includes('Palavra-chave');
        }, { timeout: 10000 });
        
        // Focar e digitar LPL01 nativamente
        const focused = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
          const visibleInput = inputs.find(i => i.offsetParent !== null);
          if (visibleInput) {
            visibleInput.focus();
            return true;
          }
          return false;
        });
        
        if (!focused) {
          throw new Error('Não foi possível focar o campo da Palavra-chave');
        }
        
        await page.keyboard.type('LPL01');
        
        // Confirmar palavra-chave
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const confirmBtn = buttons.find(b => b.innerText.includes('Confirmar') && b.offsetParent !== null);
          if (confirmBtn) {
            confirmBtn.click();
          }
        });
        
        // Aguardar redirecionamento completo para a tela de containers
        await page.waitForFunction(() => {
          return window.location.href.includes('/containers') && document.querySelector('input[type="password"]') === null;
        }, { timeout: 20000 });
        
        const cookies = await page.cookies();
        saveCookies(cookies, COOKIES_PATH_TEC);
        console.log('Teconline: Login e MFA automatizados concluídos com sucesso via headless.');
        autoSuccess = true;
      } catch (autoErr) {
        console.log('Teconline: Falha no login automático headless:', autoErr.message);
        if (process.platform !== 'win32') {
          console.log('Teconline: Falha no login automático em ambiente Linux/Render.');
          throw new Error('Falha no login automático (Teconline). Por favor, atualize os cookies da Teconline.');
        }
        console.log('Teconline: Iniciando fluxo de fallback visível (headful)...');
        
        await browser.close();

        const launchOptionsHeadful = {
          headless: false,
          defaultViewport: { width: 1280, height: 800 },
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        };
        if (chromePath) {
          launchOptionsHeadful.executablePath = chromePath;
        }
        browser = await puppeteer.launch(launchOptionsHeadful);

        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        page.setDefaultTimeout(120000); // 2 minutos para resolver MFA

        await page.goto('https://teconline.com.br/login#redirect=/containers', { waitUntil: 'networkidle2', timeout: 35000 });
        
        await page.waitForSelector('input[type="text"]', { timeout: 15000 });
        await page.type('input[type="text"]', 'WSLPLL');
        await page.type('input[type="password"]', 'IU9POE4');
        await page.click('button[type="submit"]');

        console.log('Aguardando usuário resolver a confirmação de identidade (MFA)...');
        
        try {
          await page.waitForFunction(() => {
            return window.location.href.includes('/containers') && document.querySelector('input[type="password"]') === null;
          }, { timeout: 120000 });
        } catch (e) {
          await browser.close();
          return { error: 'erro login', message: 'Login ou MFA não resolvido na janela aberta.' };
        }

        const cookies = await page.cookies();
        saveCookies(cookies, COOKIES_PATH_TEC);
        console.log('Novos cookies de sessão salvos com sucesso via headful!');
      }
    }

    await page.waitForSelector('input[type="text"]', { timeout: 15000 });
    
    await page.evaluate(() => {
      const inp = document.querySelector('input[type="text"]');
      if (inp) inp.value = '';
    });
    await page.type('input[type="text"]', containerCode);
    await page.keyboard.press('Enter');
    
    await new Promise(resolve => setTimeout(resolve, 6000));

    const result = await page.evaluate((code) => {
      const text = document.body.innerText;
      if (text.includes('Nenhum contêiner') || text.includes('Não encontrado') || text.includes('Nenhum registro')) {
        return null;
      }

      const table = document.querySelector('table');
      if (!table) return null;

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      if (rows.length === 0) return null;
      
      const firstRowCells = Array.from(rows[0].querySelectorAll('td')).map(td => td.innerText.trim());

      return {
        container: code,
        status: firstRowCells[1] || 'No pátio',
        weight: firstRowCells[2] || 'N/A',
        type: firstRowCells[3] || 'N/A',
        vessel: firstRowCells[4] || 'N/A',
        booking: firstRowCells[5] || 'N/A',
        location: firstRowCells[6] || 'Terminal',
        history: []
      };
    }, containerCode);

    await browser.close();

    if (!result) return null;

    return {
      api: 'TEC',
      ...result,
      timeScraped: new Date().toLocaleTimeString('pt-BR')
    };

  } catch (error) {
    console.error('Error scraping TEC:', error);
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    return { error: 'erro api', message: 'Erro na API do terminal Teconline Suape' };
  }
}

// Main runner for sequential tracking (to save memory on Render)
async function trackContainer(containerCode, bookingCode) {
  const code = containerCode.trim().toUpperCase();
  
  console.log(`[trackContainer] Iniciando busca sequencial para economizar memória...`);
  
  const tcpRes = await queryTCP(code).catch(err => ({ error: 'erro api', message: err.message }));
  const poaRes = await queryPOA(code, bookingCode).catch(err => ({ error: 'erro api', message: err.message }));
  const navRes = await queryNAV(code).catch(err => ({ error: 'erro api', message: err.message }));
  const tecRes = await queryTEC(code).catch(err => ({ error: 'erro api', message: err.message }));

  const results = [];
  const statuses = {};

  // TCP
  if (tcpRes) {
    if (tcpRes.error) {
      statuses.tcp = { status: tcpRes.error, message: tcpRes.message };
    } else {
      statuses.tcp = { status: 'success', message: 'Sucesso' };
      results.push(tcpRes);
    }
  } else {
    statuses.tcp = { status: 'success', message: 'Não encontrado' };
  }

  // POA
  if (poaRes) {
    if (poaRes.error) {
      statuses.poa = { status: poaRes.error, message: poaRes.message };
    } else {
      statuses.poa = { status: 'success', message: 'Sucesso' };
      results.push(poaRes);
    }
  } else {
    statuses.poa = { status: 'success', message: 'Não encontrado' };
  }

  // NAV
  if (navRes) {
    if (navRes.error) {
      statuses.nav = { status: navRes.error, message: navRes.message };
    } else {
      statuses.nav = { status: 'success', message: 'Sucesso' };
      results.push(navRes);
    }
  } else {
    statuses.nav = { status: 'success', message: 'Não encontrado' };
  }

  // TEC
  if (tecRes) {
    if (tecRes.error) {
      statuses.tec = { status: tecRes.error, message: tecRes.message };
    } else {
      statuses.tec = { status: 'success', message: 'Sucesso' };
      results.push(tecRes);
    }
  } else {
    statuses.tec = { status: 'success', message: 'Não encontrado' };
  }

  return { statuses, results };
}

module.exports = {
  trackContainer,
  queryTCP,
  queryPOA,
  queryNAV,
  queryTEC
};
