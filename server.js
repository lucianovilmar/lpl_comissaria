require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const db = require('./db');
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

// Database-driven lookup helpers
async function findBookingForContainer(containerCode) {
  try {
    const code = containerCode.trim().toUpperCase();
    const dbRes = await db.query(
      `SELECT p.booking, p.ruc 
       FROM conteineres c
       JOIN processos p ON c.processo_id = p.id
       WHERE c.numero_conteiner = $1
       LIMIT 1`,
      [code]
    );
    if (dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      return row.booking || row.ruc || null;
    }
  } catch (e) {
    console.error('Error finding booking in database:', e);
  }
  return null;
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

function forwardToLocalAgent(req, res, targetUrlStr) {
  return new Promise((resolve) => {
    try {
      const targetUrl = new URL(targetUrlStr);
      const isHttps = targetUrl.protocol === 'https:';
      const client = isHttps ? require('https') : require('http');
      
      const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const targetPath = reqUrl.pathname + reqUrl.search;
      
      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetPath,
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host
        }
      };
      
      console.log(`Encaminhando requisição para o Agente Local: ${options.method} ${targetUrl.protocol}//${options.hostname}${options.path}`);
      
      const proxyReq = client.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
        resolve();
      });
      
      proxyReq.on('error', (err) => {
        console.error('Erro ao encaminhar para o Agente Local:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Erro de gateway', 
          message: 'Não foi possível conectar ao Agente Local de Consulta. Verifique se o computador no escritório está ligado com o ngrok ativo.' 
        }));
        resolve();
      });
      
      req.pipe(proxyReq, { end: true });
    } catch (e) {
      console.error('Erro ao configurar proxy de requisição:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'erro interno', message: e.message }));
      resolve();
    }
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

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = decodeURIComponent(parsedUrl.pathname);

  // Se a variável de ambiente SCRAPER_LOCAL_URL estiver definida, encaminha busca e cookies para o agente local
  const SCRAPER_LOCAL_URL = process.env.SCRAPER_LOCAL_URL;
  if (SCRAPER_LOCAL_URL && (reqPath === '/api/search' || reqPath === '/api/upload-cookies')) {
    await forwardToLocalAgent(req, res, SCRAPER_LOCAL_URL);
    return;
  }

  // Endpoint 1: POST /api/login
  if (reqPath === '/api/login' && req.method === 'POST') {
    const { login, senha } = await readJsonBody(req);
    
    try {
      const dbRes = await db.query('SELECT * FROM usuarios WHERE LOWER(login) = LOWER($1)', [login || '']);
      const foundUser = dbRes.rows[0];
      
      let passwordMatch = false;
      if (foundUser) {
        passwordMatch = bcrypt.compareSync(senha, foundUser.senha);
      }
      
      if (foundUser && passwordMatch) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          user: foundUser.login,
          is_admin: foundUser.is_admin,
          can_view_processes: foundUser.can_view_processes,
          can_query_ports: foundUser.can_query_ports,
          can_upload_cookies: foundUser.can_upload_cookies
        }));
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

  if (reqPath === '/api/search' && req.method === 'GET') {
    const containerParam = parsedUrl.searchParams.get('container');
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
      
      const targetPort = (parsedUrl.searchParams.get('port') || '').toLowerCase();
      
      for (const code of containerCodes) {
        console.log(`Consultando contêiner: ${code}...`);
        
        let data;
        if (targetPort) {
          const booking = await findBookingForContainer(code);
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
      const summaryRes = await db.query(
        `SELECT origem_aba, COUNT(*) as count 
         FROM processos 
         WHERE ativo = true 
         GROUP BY origem_aba`
      );
      
      const summary = {
        "AGUARDANDO EMBARQUE": 0,
        "DRAFT": 0,
        "DUE": 0,
        "RODOVIARIO": 0,
        "USO MARFRIG": 0
      };
      
      summaryRes.rows.forEach(row => {
        if (summary[row.origem_aba] !== undefined) {
          summary[row.origem_aba] = parseInt(row.count, 10);
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
    const aba = parsedUrl.searchParams.get('aba') || 'AGUARDANDO EMBARQUE';
    try {
      const historyAbas = ["Emb. 2026", "Emb. 2025", "Emb. 2024", "Emb. Cancelados"];
      const ativo = !historyAbas.includes(aba);
      
      const dbRes = await db.query(
        `SELECT 
           p.exp_code as "EXP", p.exp_code as "EXP Nº", p.exp_code as "Referência",
           p.exportador as "EXPORTADOR", p.exportador as "Exportador",
           p.importador as "IMPORTADOR", p.importador as "Importador",
           p.navio as "NAVIO", p.navio as "Navio",
           p.booking as "BOOKING", p.booking as "Booking",
           p.data_estufagem as "DATA ESTUFAGEM",
           p.dl_draft as "D/L DRAFT",
           p.dl_carga as "D/L CARGA", p.dl_carga as "D/L Carga",
           p.eta as "ETA",
           p.ets as "ETS",
           p.origem as "ORIGEM", p.origem as "Origem",
           p.destino as "DESTINO", p.destino as "Destino",
           p.armador as "ARMADOR", p.armador as "Armador",
           p.controle_interno as "CONTROLE INTERNO", p.controle_interno as "Controle Interno",
           p.bysoft as "BYSOFT",
           p.ruc as "RUC", p.ruc as "DUE/RUC",
           p.csi as "CSI",
           p.deposito_no_porto as "DEPÓSITO NO PORTO",
           p.em_registro as "EM REGISTRO",
           p.due as "DUE",
           p.nº_due as "Nº DUE",
           p.fronteira as "FRONTEIRA",
           p.pais as "PAÍS",
           p.transportadora as "TRANSPORTADORA",
           p.cavalo as "CAVALO",
           p.carreta as "CARRETA",
           p.liberacao_br as "LIBERAÇÃO - BR",
           p.pallets as "PALLETS",
           p.terminal_atracacao as "Terminal Atracação",
           p.produto as "Produto",
           p.protocolado as "Protocolado",
           c.numero_conteiner as "CONTAINER", c.numero_conteiner as "Container",
           c.temperatura as "TEMP.",
           c.amend as "AMEND",
           c.alterar_provisorio as "ALTERAR\nPROVISÓRIO"
         FROM processos p
         LEFT JOIN conteineres c ON p.id = c.processo_id
         WHERE p.origem_aba = $1 AND p.ativo = $2
         ORDER BY p.id ASC, c.id ASC`,
        [aba, ativo]
      );
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbRes.rows));
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
