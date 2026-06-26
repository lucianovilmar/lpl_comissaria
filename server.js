const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const XLSX = require('xlsx');
const { trackContainer, queryTCP, queryPOA, queryNAV, queryTEC } = require('./ports-crawler');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname);

const mime = {
  '.html':'text/html',
  '.css':'text/css',
  '.js':'application/javascript',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.json':'application/json'
};

const EXCEL_PATH = 'C:\\Users\\LVS 06 Dev\\Downloads\\Gestão de Processos - MARFRIG x DESPACHANTES.xlsx';
let cachedWorkbook = null;
let cachedMtime = null;

// Helper to convert Excel serial date to DD/MM/AAAA
function excelDateToDateString(excelSerial) {
  if (!excelSerial || isNaN(excelSerial) || excelSerial === "#N/A") return excelSerial;
  try {
    const date = new Date((excelSerial - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return excelSerial;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch(e) {
    return excelSerial;
  }
}

// Load workbook with file mtime caching
function loadWorkbook() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error('Arquivo Excel de processos não localizado na pasta de downloads.');
  }
  const stats = fs.statSync(EXCEL_PATH);
  const mtime = stats.mtimeMs;
  if (!cachedWorkbook || cachedMtime !== mtime) {
    console.log(`Carregando planilha de processos do Excel (mtime: ${mtime})...`);
    cachedWorkbook = XLSX.readFile(EXCEL_PATH);
    cachedMtime = mtime;
  }
  return cachedWorkbook;
}

// Lookup booking code for a container code in the Excel sheet
function findBookingForContainer(containerCode) {
  try {
    const wb = loadWorkbook();
    const abas = ["AGUARDANDO EMBARQUE", "DRAFT", "DUE", "USO MARFRIG"];
    const code = containerCode.trim().toUpperCase();
    
    for (const name of abas) {
      const sheet = wb.Sheets[name];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      for (const row of rows) {
        const containerVal = String(row['CONTAINER'] || row['Container'] || '').trim().toUpperCase();
        if (containerVal === code) {
          const bookingVal = String(row['BOOKING'] || row['Booking'] || row['DUE/RUC'] || '').trim();
          if (bookingVal && bookingVal !== "#N/A") {
            return bookingVal;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error finding booking in Excel:', e);
  }
  return null;
}

function getProcessosData(abaName) {
  const wb = loadWorkbook();
  const sheet = wb.Sheets[abaName];
  if (!sheet) {
    throw new Error(`Aba "${abaName}" não encontrada no arquivo do Excel.`);
  }
  
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  
  // Lista de campos comuns que são datas no Excel e devem ser convertidas
  const dataFields = ['ETA', 'ETS', 'DATA ESTUFAGEM', 'D/L Carga', 'D/L CARGA', 'D/L DRAFT', 'LIBERAÇÃO - BR', 'DATA REGISTRO', 'Chegada do CSI', 'Protocolado'];
  
  return rows.map(row => {
    const formattedRow = { ...row };
    dataFields.forEach(f => {
      if (formattedRow[f] && typeof formattedRow[f] === 'number') {
        formattedRow[f] = excelDateToDateString(formattedRow[f]);
      }
    });
    return formattedRow;
  });
}

// Helper to read JSON body
function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); // 204 No Content
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const reqPath = decodeURIComponent(parsedUrl.pathname);

  // Endpoint 1: POST /api/login
  if (reqPath === '/api/login' && req.method === 'POST') {
    const { login, senha } = await readJsonBody(req);
    
    try {
      const usersData = fs.readFileSync(path.join(PUBLIC, 'users.json'), 'utf8');
      const users = JSON.parse(usersData);
      
      const foundUser = users.find(u => u.login.toLowerCase() === (login || '').toLowerCase() && u.senha === senha);
      
      if (foundUser) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: foundUser.login }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Usuário ou senha incorretos.' }));
      }
    } catch (err) {
      console.error('Error in login api:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Erro interno no servidor de login.' }));
    }
    return;
  }

  // Endpoint 1.5: POST /api/upload-cookies
  if (reqPath === '/api/upload-cookies' && req.method === 'POST') {
    const { type, cookies } = await readJsonBody(req);
    
    if (!type || !cookies || !Array.isArray(cookies)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parâmetros inválidos ou cookies ausentes.' }));
      return;
    }
    
    let filePath;
    if (type === 'tcp') filePath = path.join(PUBLIC, 'tcp-cookies.json');
    else if (type === 'poa') filePath = path.join(PUBLIC, 'poa-cookies.json');
    else if (type === 'nav') filePath = path.join(PUBLIC, 'nav-cookies.json');
    else if (type === 'tec') filePath = path.join(PUBLIC, 'tec-cookies.json');
    else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Porto de cookies inválido.' }));
      return;
    }
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
      console.log(`Cookies para ${type.toUpperCase()} atualizados via upload web.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Cookies do terminal ${type.toUpperCase()} atualizados com sucesso!` }));
    } catch (err) {
      console.error(`Erro ao salvar cookies de ${type}:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao salvar os cookies no servidor.' }));
    }
    return;
  }

  // Endpoint 2: GET /api/search
  if (reqPath === '/api/search' && req.method === 'GET') {
    const containerParam = parsedUrl.query.container;
    if (!containerParam) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta o parâmetro container' }));
      return;
    }
    
    try {
      const containerCodes = containerParam.split(',')
        .map(c => c.trim().toUpperCase())
        .filter(Boolean);
        
      console.log(`Iniciando busca em lote para os contêineres: ${containerCodes.join(', ')}`);
      
      const allResults = [];
      const aggregatedStatuses = {
        tcp: { status: 'success', message: 'Não consultado' },
        poa: { status: 'success', message: 'Não consultado' },
        nav: { status: 'success', message: 'Não consultado' },
        tec: { status: 'success', message: 'Não consultado' }
      };
      
      const targetPort = (parsedUrl.query.port || '').toLowerCase();
      
      for (const code of containerCodes) {
        console.log(`Consultando contêiner: ${code}...`);
        
        let data;
        if (targetPort) {
          const booking = findBookingForContainer(code);
          if (booking) {
            console.log(`Booking encontrado no Excel para o contêiner ${code}: ${booking}`);
          }
          
          let resVal = null;
          let statusErr = null;
          let statusMsg = null;
          
          try {
            if (targetPort === 'tcp') {
              resVal = await queryTCP(code);
            } else if (targetPort === 'poa') {
              resVal = await queryPOA(code, booking);
            } else if (targetPort === 'nav') {
              resVal = await queryNAV(code);
            } else if (targetPort === 'tec') {
              resVal = await queryTEC(code);
            } else {
              throw new Error(`Porto "${targetPort}" inválido.`);
            }
          } catch (err) {
            statusErr = 'erro api';
            statusMsg = err.message;
          }
          
          const statuses = {};
          const results = [];
          
          if (statusErr) {
            statuses[targetPort] = { status: statusErr, message: statusMsg };
          } else if (resVal) {
            if (resVal.error) {
              statuses[targetPort] = { status: resVal.error, message: resVal.message };
            } else {
              statuses[targetPort] = { status: 'success', message: 'Sucesso' };
              results.push(resVal);
            }
          } else {
            statuses[targetPort] = { status: 'success', message: 'Não encontrado' };
          }
          
          data = { statuses, results };
        } else {
          const booking = findBookingForContainer(code);
          if (booking) {
            console.log(`Booking encontrado no Excel para o contêiner ${code}: ${booking}`);
          }
          data = await trackContainer(code, booking);
        }
        
        if (data.results && data.results.length > 0) {
          allResults.push(...data.results);
        } else {
          allResults.push({
            container: code,
            api: targetPort ? targetPort.toUpperCase() : 'TCP',
            status: 'Não localizado nas consultas deste terminal',
            notFound: true,
            timeScraped: new Date().toLocaleTimeString('pt-BR'),
            history: []
          });
        }
        
        if (data.statuses) {
          Object.keys(data.statuses).forEach(port => {
            const val = data.statuses[port];
            const current = aggregatedStatuses[port];
            
            // Determinar peso de prioridade para exibição de status
            const getWeight = (s) => {
              if (s.status === 'erro login') return 4;
              if (s.status === 'erro api') return 3;
              if (s.status === 'success' && s.message === 'Sucesso') return 2;
              if (s.status === 'success' && s.message === 'Não encontrado') return 1;
              return 0; // Não consultado
            };
            
            if (getWeight(val) > getWeight(current)) {
              aggregatedStatuses[port] = val;
            }
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ statuses: aggregatedStatuses, results: allResults }));
    } catch (err) {
      console.error('Error tracking container batch:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'erro api', message: err.message }));
    }
    return;
  }

  // Endpoint 3: GET /api/processos/summary
  if (reqPath === '/api/processos/summary' && req.method === 'GET') {
    try {
      const wb = loadWorkbook();
      const summary = {};
      const keyAbas = ["AGUARDANDO EMBARQUE", "DRAFT", "DUE", "RODOVIARIO", "USO MARFRIG"];
      keyAbas.forEach(aba => {
        const sheet = wb.Sheets[aba];
        if (sheet) {
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          summary[aba] = rows.length;
        } else {
          summary[aba] = 0;
        }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary));
    } catch (err) {
      console.error('Error in processos summary api:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'erro api', message: err.message }));
    }
    return;
  }

  // Endpoint 4: GET /api/processos
  if (reqPath === '/api/processos' && req.method === 'GET') {
    const aba = parsedUrl.query.aba || 'AGUARDANDO EMBARQUE';
    try {
      const data = getProcessosData(aba);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('Error in processos api:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'erro api', message: err.message }));
    }
    return;
  }

  // Comportamento original: servir arquivos estáticos
  let staticPath = reqPath;
  if(staticPath === '/') staticPath = '/index.html';
  const filePath = path.join(PUBLIC, staticPath);

  fs.stat(filePath, (err, stats) => {
    if(err || !stats.isFile()){
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': type});
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
