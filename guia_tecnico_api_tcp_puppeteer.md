# 🛠️ Guia Técnico Definitivo: Rastreamento Direto da API/Portal TCP (Sem ngrok)

> **Projeto de Origem**: LPL Comissária  
> **Projeto de Destino**: LPL - Relatórios - Dashboard (Servidor Local On-Premise LPL)  
> **Objetivo**: Fornecer o código-fonte exato e a explicação técnica passo a passo de como realizar a consulta **REAL e DINÂMICA** ao portal da TCP Paranaguá usando Puppeteer + Cookies, eliminando dados estáticos/mockados.

---

## 🎯 1. Como Funciona a Consulta Real vs. Mock

No projeto original da LPL, a consulta ao portal do TCP **NÃO utiliza dados estáticos de imagens**. O fluxo executa uma raspagem automatizada em tempo real (Scraper Headless) que:

1. Carrega os cookies salvos em `tcp-cookies.json`.
2. Acessa o portal da TCP (`https://portal.tcp.com.br/consulta-geral/conteineres`).
3. Preenche o input `input#search` com o código do contêiner informado.
4. Clica na tabela de resultados e navega pelas **Sub-abas do Angular Material** (`Situação`, `Detalhes`, `Agendamento`).
5. Converte o HTML extraído do portal em um **JSON estruturado real**.
6. Retorna este JSON para o Frontend, que constrói os cards e a timeline **dinamicamente**.

---

## 🏗️ 2. Código do Crawler TCP Completo (`ports-crawler.js` - Versão Direta Local)

Abaixo está o código Node.js exato que executa o Puppeteer diretamente no servidor (sem precisar de ngrok):

```javascript
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const COOKIES_PATH_TCP = path.join(__dirname, 'tcp-cookies.json');

// Helper para carregar cookies
function loadCookies(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao carregar cookies:', e.message);
  }
  return null;
}

// Helper para salvar cookies
function saveCookies(cookies, filePath) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  } catch (e) {
    console.error('Erro ao salvar cookies:', e.message);
  }
}

// Funcao Principal de Consulta ao TCP (Paranaguá)
async function queryTCP(containerCode) {
  if (!containerCode) {
    throw new Error('Código do contêiner não fornecido.');
  }

  const launchOptions = {
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ]
  };

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // 1. Evasão de detecção WAF / Anti-Bot
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { app: { isInstalled: false } };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US'] });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultTimeout(60000);

    // 2. Aplicar Cookies de Sessão Salvos (Sincronizados pelo Bookmarklet)
    const savedCookies = loadCookies(COOKIES_PATH_TCP);
    if (!savedCookies) {
      throw new Error('Cookies do TCP não encontrados. Use o Sincronizador de 1-Clique para conectar.');
    }

    // Ir para a home para estabelecer domínio dos cookies
    await page.goto('https://portal.tcp.com.br/', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Filtrar cookies de WAF temporários que expiram por IP
    const filteredCookies = savedCookies.filter(c => 
      !c.name.startsWith('incap_ses') && 
      !c.name.startsWith('visid_incap') && 
      !c.name.startsWith('nlbi')
    );
    await page.setCookie(...filteredCookies);

    // 3. Navegar para a Tela de Consulta Geral
    await page.goto('https://portal.tcp.com.br/consulta-geral/conteineres', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Verificar se foi redirecionado para login (Sessão Expirada)
    if (page.url().includes('login')) {
      throw new Error('Sessão do TCP expirada. Favor clicar no Sincronizador 1-Clique para renovar.');
    }

    // 4. Preencher o Campo de Busca
    const searchInputSelector = 'input#search';
    await page.waitForSelector(searchInputSelector, { timeout: 15000 });

    await page.evaluate((sel, code) => {
      const input = document.querySelector(sel);
      if (input) {
        input.value = code;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = document.querySelector('button.submit-button');
      if (btn) {
        setTimeout(() => btn.click(), 0);
      }
    }, searchInputSelector, containerCode);

    // Aguardar 6 segundos para carregamento dos dados Angular
    await new Promise(r => setTimeout(r, 6000));

    // 5. Verificar se encontrou o contêiner na tabela lateral
    const hasContainer = await page.evaluate(() => {
      const sideTable = document.querySelector('app-conteiner-side-table');
      return sideTable && sideTable.querySelector('a') !== null;
    });

    if (!hasContainer) {
      await browser.close();
      return null; // Contêiner não localizado
    }

    // 6. Clicar no link do contêiner para abrir as abas de detalhes
    await page.evaluate(() => {
      const el = document.querySelector('app-conteiner-side-table a');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // 7. Extrair Etapas do Stepper (Entrada, Aduaneiro, Embarque, Faturamento)
    const stepperData = await page.evaluate(() => {
      const steps = {};
      const labels = ['Entrada', 'Aduaneiro', 'Embarque', 'Faturamento'];
      const elems = Array.from(document.querySelectorAll('span, div, p, td, th, mat-step, .mat-step'));

      labels.forEach(label => {
        const el = elems.find(e => e.childNodes.length === 1 && e.textContent.trim() === label);
        if (el && el.parentElement) {
          let date = '-';
          let state = 'pending';
          const text = el.parentElement.textContent || '';
          const match = text.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
          if (match) date = match[1];

          if (text.toLowerCase().includes('done')) state = 'completed';
          else if (date !== '-') state = 'active';

          steps[label] = { date, state };
        } else {
          steps[label] = { date: '-', state: 'pending' };
        }
      });
      return steps;
    });

    // 8. Extrair Aba: Situação
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

    // 9. Extrair Aba: Detalhes
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-tab-label, .mat-tab-link, [role="tab"]'));
      const target = tabs.find(t => t.innerText.includes('Detalhes'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 2000));

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
            headers.forEach((h, idx) => { if (h) doc[h] = cells[idx] || ''; });
            documentos.push(doc);
          }
        });
      }
      return { kvs, documentos };
    });

    // 10. Extrair Aba: Agendamento
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.mat-tab-label, .mat-tab-link, [role="tab"]'));
      const target = tabs.find(t => t.innerText.includes('Agendamento'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 2000));

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
      const labels = ['Agendamento', 'SAV', 'Entrada Gate', 'Operação', 'Saída Gate'];
      const elems = Array.from(document.querySelectorAll('span, div, p, td, th'));

      labels.forEach(label => {
        const el = elems.find(e => e.childNodes.length === 1 && e.textContent.trim() === label);
        if (el && el.parentElement) {
          let date = '-';
          const match = el.parentElement.textContent.match(/([0-9]{2}\/[0-9]{2}\/[0-9]{4}\s+[0-9]{2}:[0-9]{2})/);
          if (match) date = match[1];
          timeline[label] = date;
        } else {
          timeline[label] = '-';
        }
      });
      return { kvs, timeline };
    });

    await browser.close();

    // 11. Montar Objeto de Retorno com os Dados Reais
    return {
      api: 'TCP',
      container: containerCode,
      status: situacaoData['Status'] || situacaoData['Situação'] || 'No Pátio',
      isDetailed: true,
      stepper: stepperData,
      situacao: situacaoData,
      detalhes: detalhesData,
      agendamento: agendamentoData,
      timeScraped: new Date().toLocaleTimeString('pt-BR')
    };

  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

module.exports = { queryTCP, saveCookies, loadCookies };
```

---

## 🌐 3. Código da Rota Backend Express (`server.js`)

A rota `/api/search` deve chamar `queryTCP` e devolver o JSON exato:

```javascript
const express = require('express');
const app = express();
const { queryTCP } = require('./ports-crawler');

app.get('/api/search', async (req, res) => {
  const container = (req.query.container || '').trim().toUpperCase();
  
  if (!container) {
    return res.status(400).json({ error: 'erro api', message: 'Código do contêiner obrigatório' });
  }

  try {
    const result = await queryTCP(container);
    if (!result) {
      return res.json({
        statuses: { tcp: { status: 'success', message: 'Não encontrado' } },
        results: [{ container, api: 'TCP', notFound: true, status: 'Não localizado no TCP' }]
      });
    }

    return res.json({
      statuses: { tcp: { status: 'success', message: 'Sucesso' } },
      results: [result]
    });
  } catch (err) {
    return res.status(500).json({
      statuses: { tcp: { status: 'erro api', message: err.message } },
      error: 'erro api',
      message: err.message
    });
  }
});
```

---

## 🎨 4. Renderização Dinâmica no Frontend (`app.js`)

O frontend **NÃO hardcodeia dados**. Ele recebe o array `results` da chamada `/api/search?container=MNBU0521466` e itera sobre a chave `situacao`:

```javascript
function renderResultsList(results) {
  const containerArea = document.getElementById('resultsArea');
  containerArea.innerHTML = '';

  results.forEach(res => {
    if (!res.isDetailed) return;

    // 1. Renderizar os quadros da Aba Situação dinamicamente
    const situacaoGridHtml = Object.keys(res.situacao).map(k => `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
        <span style="color: #8a99ad; font-size: 11px; display: block; margin-bottom: 2px;">${k}</span>
        <strong style="color: #ffffff; font-size: 13px;">${res.situacao[k] || '-'}</strong>
      </div>
    `).join('');

    // 2. Injetar no Card do Contêiner
    const cardHtml = `
      <div class="container-card">
        <h3>[${res.api}] ${res.container} - ${res.timeScraped}</h3>
        <div class="situacao-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          ${situacaoGridHtml}
        </div>
      </div>
    `;

    containerArea.insertAdjacentHTML('beforeend', cardHtml);
  });
}
```

---

## 📌 Resumo para Copiar para o Novo Projeto:
1. Copie o arquivo `ports-crawler.js` com a função `queryTCP`.
2. Garanta que o arquivo `tcp-cookies.json` esteja na mesma pasta do projeto.
3. Configure a rota `/api/search` no seu `server.js` chamando `queryTCP(container)`.
4. No frontend, faça `fetch('/api/search?container=' + codigo)` e use os dados de `result.results[0].situacao`.
