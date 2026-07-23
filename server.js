require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
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
          host: targetUrl.host,
          'ngrok-skip-browser-warning': 'true'
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
      
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
        proxyReq.end();
      } else {
        req.pipe(proxyReq, { end: true });
      }
    } catch (e) {
      console.error('Erro ao configurar proxy de requisição:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'erro interno', message: e.message }));
      resolve();
    }
  });
}

function enviarCookiesParaAgenteLocal(targetUrlStr, type, cookies) {
  try {
    const targetUrl = new URL(targetUrlStr);
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? require('https') : require('http');
    
    const payload = JSON.stringify({ type, cookies });
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: '/api/upload-cookies',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'ngrok-skip-browser-warning': 'true'
      }
    };
    
    console.log(`Sincronizando cookies em segundo plano com o Agente Local: POST ${targetUrl.protocol}//${options.hostname}${options.path}`);
    const req = client.request(options, (res) => {
      console.log(`Agente Local respondeu com status: ${res.statusCode} ao envio de cookies.`);
    });
    
    req.on('error', (err) => {
      console.error('Erro ao enviar cookies para o Agente Local:', err.message);
    });
    
    req.write(payload);
    req.end();
  } catch (err) {
    console.error('Falha ao configurar envio de cookies para o Agente Local:', err);
  }
}

// Token HMAC Security helpers
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET || 'lpl_comissaria_secret_key_123!';

function generateToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64');
  if (signature !== expectedSignature) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

function checkAdmin(req, res) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.is_admin) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar esta área.' }));
    return null;
  }
  return user;
}

async function enviarEmail(destinatario, assunto, textoHtml, textoSimples) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('--- SIMULADOR DE E-MAIL ---');
    console.log(`Para: ${destinatario}`);
    console.log(`Assunto: ${assunto}`);
    console.log(`Mensagem:\n${textoSimples}`);
    console.log('---------------------------\n');
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"LPL Comissária" <${user}>`,
      to: destinatario,
      subject: assunto,
      text: textoSimples,
      html: textoHtml
    });
    console.log(`E-mail enviado com sucesso para ${destinatario}`);
    return true;
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err.message);
    return false;
  }
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

  // Se a variável de ambiente SCRAPER_LOCAL_URL estiver definida, encaminha busca para o agente local
  const SCRAPER_LOCAL_URL = process.env.SCRAPER_LOCAL_URL;
  if (SCRAPER_LOCAL_URL && reqPath === '/api/search') {
    const containerParam = (parsedUrl.searchParams.get('container') || '').trim();
    const targetPort = (parsedUrl.searchParams.get('port') || '').trim().toLowerCase();
    
    if (containerParam && targetPort === 'poa') {
      const isContainer = /^[A-Z]{4}[0-9]{6,7}$/i.test(containerParam);
      if (!isContainer) {
        console.log(`Render: O input "${containerParam}" não parece um contêiner. Assumindo que é o próprio Booking.`);
        parsedUrl.searchParams.set('booking', containerParam);
        req.url = parsedUrl.pathname + parsedUrl.search;
      } else {
        try {
          const booking = await findBookingForContainer(containerParam);
          if (booking) {
            console.log(`Render: Booking encontrado no Supabase para o contêiner ${containerParam}: ${booking}. Repassando para o agente local.`);
            parsedUrl.searchParams.set('booking', booking);
            req.url = parsedUrl.pathname + parsedUrl.search;
          }
        } catch (err) {
          console.error('Render: Erro ao buscar booking no Supabase antes de repassar:', err.message);
        }
      }
    }
    
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
        if (foundUser.ativo === false) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Esta conta está desativada. Entre em contato com o administrador.' }));
          return;
        }
        
        const token = generateToken({
          id: foundUser.id,
          login: foundUser.login,
          email: foundUser.email,
          is_admin: foundUser.is_admin,
          can_view_processes: foundUser.can_view_processes,
          can_query_ports: foundUser.can_query_ports,
          can_upload_cookies: foundUser.can_upload_cookies
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          token,
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
      
      const SCRAPER_LOCAL_URL = process.env.SCRAPER_LOCAL_URL;
      if (SCRAPER_LOCAL_URL) {
        enviarCookiesParaAgenteLocal(SCRAPER_LOCAL_URL, type, cookies);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Cookies do terminal ${type.toUpperCase()} atualizados com sucesso!` }));
    } catch (err) {
      console.error(`Erro ao salvar cookies de ${type}:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao salvar os cookies no servidor.' }));
    }
    return;
  }

  // Endpoint 1.6: GET /api/cookies/status
  if (reqPath === '/api/cookies/status' && req.method === 'GET') {
    const ports = ['tcp', 'poa', 'nav', 'tec'];
    const statuses = {};
    
    ports.forEach(port => {
      let fileName = `${port}-cookies.json`;
      let filePath = path.join(PUBLIC, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const lastUpdated = stats.mtime;
          const formattedTime = lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const formattedDate = lastUpdated.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          statuses[port] = {
            status: 'online',
            message: `Conectado (${formattedDate} às ${formattedTime})`
          };
        } catch (e) {
          statuses[port] = { status: 'offline', message: 'Erro ao verificar' };
        }
      } else {
        statuses[port] = {
          status: 'offline',
          message: 'Desconectado (Sem cookies)'
        };
      }
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, statuses }));
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
          let booking = (parsedUrl.searchParams.get('booking') || '').trim();
          if (!booking) {
            const isContainer = /^[A-Z]{4}[0-9]{6,7}$/i.test(code);
            if (!isContainer) {
              booking = code;
            } else {
              try {
                booking = await findBookingForContainer(code);
              } catch (dbErr) {
                console.error('Error finding booking in database:', dbErr.message);
                booking = null;
              }
            }
          }
          if (booking) {
            console.log(`Booking utilizado para o contêiner ${code}: ${booking}`);
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
          let booking = (parsedUrl.searchParams.get('booking') || '').trim();
          if (!booking) {
            const isContainer = /^[A-Z]{4}[0-9]{6,7}$/i.test(code);
            if (!isContainer) {
              booking = code;
            } else {
              try {
                booking = await findBookingForContainer(code);
              } catch (dbErr) {
                console.error('Error finding booking in database:', dbErr.message);
                booking = null;
              }
            }
          }
          if (booking) {
            console.log(`Booking utilizado para o contêiner ${code}: ${booking}`);
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

  // Endpoint 5: POST /api/forgot-password
  if (reqPath === '/api/forgot-password' && req.method === 'POST') {
    const { login } = await readJsonBody(req);
    if (!login) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Informe seu login ou e-mail.' }));
      return;
    }
    
    try {
      const dbRes = await db.query(
        'SELECT id, login, email FROM usuarios WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1)',
        [login.trim()]
      );
      
      if (dbRes.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Usuário ou e-mail não localizado.' }));
        return;
      }
      
      const user = dbRes.rows[0];
      if (!user.email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Usuário não possui e-mail cadastrado para recuperação.' }));
        return;
      }
      
      // Gerar senha temporária de 6 caracteres alfanuméricos
      const tempPass = Math.random().toString(36).substring(2, 8).toUpperCase();
      const hash = bcrypt.hashSync(tempPass, 10);
      
      await db.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, user.id]);
      
      const subject = 'Recuperação de Senha - LPL Comissária';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Recuperação de Senha</h2>
          <p>Olá, <strong>${user.login}</strong>.</p>
          <p>Uma solicitação de redefinição de senha foi realizada para sua conta.</p>
          <p>Use a seguinte senha temporária para acessar o sistema:</p>
          <div style="background: #f1f5f9; padding: 12px; font-size: 20px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 2px; margin: 20px 0;">
            ${tempPass}
          </div>
          <p style="color: #ef4444; font-size: 13px;"><strong>Importante:</strong> Recomendamos alterar esta senha assim que fizer o login em sua conta.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">LPL Comissária de Despachos Ltda. - Itajaí/SC</p>
        </div>
      `;
      const textBody = `Olá, ${user.login}.\n\nUma solicitação de redefinição de senha foi realizada para sua conta.\n\nSua nova senha temporária de acesso é: ${tempPass}\n\nRecomendamos alterar sua senha após efetuar o login.`;
      
      const emailSent = await enviarEmail(user.email, subject, htmlBody, textBody);
      
      if (emailSent) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Senha temporária enviada com sucesso para o e-mail cadastrado.' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao disparar o e-mail de recuperação. Tente novamente mais tarde.' }));
      }
    } catch (err) {
      console.error('Error in forgot-password:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao processar recuperação de senha.' }));
    }
    return;
  }

  // Endpoint 5.1: GET /api/profile
  if (reqPath === '/api/profile' && req.method === 'GET') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Não autorizado.' }));
      return;
    }
    try {
      const dbRes = await db.query('SELECT login, email FROM usuarios WHERE id = $1', [user.id]);
      if (dbRes.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Usuário não encontrado.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbRes.rows[0]));
    } catch (err) {
      console.error('Error fetching profile:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao obter dados do perfil.' }));
    }
    return;
  }

  // Endpoint 5.2: PUT /api/profile
  if (reqPath === '/api/profile' && req.method === 'PUT') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Não autorizado.' }));
      return;
    }
    try {
      const { login, senha } = await readJsonBody(req);
      if (!login || !login.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'O nome de usuário é obrigatório.' }));
        return;
      }

      // Verificar duplicidade de login
      const checkUser = await db.query(
        'SELECT id FROM usuarios WHERE LOWER(login) = LOWER($1) AND id != $2',
        [login.trim(), user.id]
      );
      if (checkUser.rows.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Este nome de usuário já está em uso.' }));
        return;
      }

      if (senha) {
        if (senha.length < 6 || senha.length > 15) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'A senha deve conter entre 6 e 15 caracteres.' }));
          return;
        }
        const hash = bcrypt.hashSync(senha, 10);
        await db.query(
          'UPDATE usuarios SET login = $1, senha = $2 WHERE id = $3',
          [login.trim(), hash, user.id]
        );
      } else {
        await db.query(
          'UPDATE usuarios SET login = $1 WHERE id = $2',
          [login.trim(), user.id]
        );
      }

      // Obter dados atualizados para gerar o novo token
      const updatedUserRes = await db.query('SELECT * FROM usuarios WHERE id = $1', [user.id]);
      const updatedUser = updatedUserRes.rows[0];

      const token = generateToken({
        id: updatedUser.id,
        login: updatedUser.login,
        email: updatedUser.email,
        is_admin: updatedUser.is_admin,
        can_view_processes: updatedUser.can_view_processes,
        can_query_ports: updatedUser.can_query_ports,
        can_upload_cookies: updatedUser.can_upload_cookies
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Perfil atualizado com sucesso!',
        user: updatedUser.login,
        token: token
      }));
    } catch (err) {
      console.error('Error updating profile:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao atualizar dados do perfil.' }));
    }
    return;
  }

  // Endpoint 6: GET /api/admin/users
  if (reqPath === '/api/admin/users' && req.method === 'GET') {
    if (!checkAdmin(req, res)) return;
    try {
      const dbRes = await db.query(
        'SELECT id, login, email, ativo, is_admin, can_view_processes, can_query_ports, can_upload_cookies FROM usuarios ORDER BY login ASC'
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbRes.rows));
    } catch (err) {
      console.error('Error fetching admin users:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao obter usuários.' }));
    }
    return;
  }

  // Endpoint 7: POST /api/admin/users
  if (reqPath === '/api/admin/users' && req.method === 'POST') {
    const adminUser = checkAdmin(req, res);
    if (!adminUser) return;
    
    try {
      const { login, email, senha, is_admin, can_view_processes, can_query_ports, can_upload_cookies, ativo } = await readJsonBody(req);
      
      // Validações (estilo Green)
      if (!login || !email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Nome de usuário e e-mail são obrigatórios.' }));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'O formato do e-mail é inválido.' }));
        return;
      }

      let finalSenha = senha;
      let sendEmail = false;
      if (!finalSenha) {
        finalSenha = Math.random().toString(36).substring(2, 8).toUpperCase();
        sendEmail = true;
      } else {
        if (finalSenha.length < 6 || finalSenha.length > 15) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'A senha deve conter entre 6 e 15 caracteres.' }));
          return;
        }
      }
      
      // Verificar se já existe o login ou e-mail
      const existQuery = await db.query(
        'SELECT id FROM usuarios WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($2)',
        [login.trim(), email.trim()]
      );
      if (existQuery.rows.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Nome de usuário ou e-mail já cadastrado.' }));
        return;
      }
      
      const hash = bcrypt.hashSync(finalSenha, 10);
      await db.query(
        `INSERT INTO usuarios (login, email, senha, is_admin, can_view_processes, can_query_ports, can_upload_cookies, ativo) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          login.trim(), 
          email.trim(), 
          hash, 
          !!is_admin, 
          !!can_view_processes, 
          !!can_query_ports, 
          !!can_upload_cookies,
          ativo !== false
        ]
      );

      if (sendEmail) {
        const subject = 'Bem-vindo ao Painel LPL - Cadastre sua senha';
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0f172a;">Bem-vindo ao Painel LPL</h2>
            <p>Olá, <strong>${login}</strong>.</p>
            <p>Um novo usuário foi cadastrado para você no sistema de Gestão e Rastreamento LPL.</p>
            <p>Para efetuar o seu primeiro acesso e cadastrar sua senha definitiva, use a seguinte senha temporária:</p>
            <div style="background: #f1f5f9; padding: 12px; font-size: 20px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 2px; margin: 20px 0;">
              ${finalSenha}
            </div>
            <p style="color: #64748b; font-size: 13px;">Recomendamos alterar sua senha provisória logo após o primeiro login.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">LPL Comissária de Despachos Ltda. - Itajaí/SC</p>
          </div>
        `;
        const textBody = `Olá, ${login}.\n\nUm novo usuário foi cadastrado para você no Painel LPL.\n\nSua senha temporária de acesso é: ${finalSenha}\n\nRecomendamos alterar sua senha após efetuar o login.`;
        
        await enviarEmail(email, subject, htmlBody, textBody);
      }
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Usuário cadastrado com sucesso!' }));
    } catch (err) {
      console.error('Error creating user:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao cadastrar usuário no banco.' }));
    }
    return;
  }

  // Endpoint 8: PUT /api/admin/users/:id
  if (reqPath.startsWith('/api/admin/users/') && req.method === 'PUT') {
    const adminUser = checkAdmin(req, res);
    if (!adminUser) return;
    
    const idStr = reqPath.substring('/api/admin/users/'.length);
    const userId = parseInt(idStr, 10);
    if (isNaN(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ID de usuário inválido.' }));
      return;
    }
    
    try {
      const { login, email, senha, is_admin, can_view_processes, can_query_ports, can_upload_cookies, ativo } = await readJsonBody(req);
      
      // Prevenir que um administrador desative a si mesmo
      if (adminUser.id === userId && ativo === false) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Você não pode desativar sua própria conta de administrador ativa.' }));
        return;
      }
      
      // Prevenir que um administrador remova sua própria permissão admin
      if (adminUser.id === userId && is_admin === false) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Você não pode revogar sua própria permissão de administrador.' }));
        return;
      }

      // Validações básicas
      if (!login || !email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Nome de usuário e e-mail são obrigatórios.' }));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'O formato do e-mail é inválido.' }));
        return;
      }
      if (senha && (senha.length < 6 || senha.length > 15)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'A senha deve conter entre 6 e 15 caracteres.' }));
        return;
      }
      
      // Verificar se já existe o login ou e-mail em outro usuário
      const existQuery = await db.query(
        'SELECT id FROM usuarios WHERE (LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($2)) AND id != $3',
        [login.trim(), email.trim(), userId]
      );
      if (existQuery.rows.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Nome de usuário ou e-mail já em uso por outro usuário.' }));
        return;
      }
      
      if (senha) {
        const hash = bcrypt.hashSync(senha, 10);
        await db.query(
          `UPDATE usuarios 
           SET login = $1, email = $2, senha = $3, is_admin = $4, can_view_processes = $5, can_query_ports = $6, can_upload_cookies = $7, ativo = $8
           WHERE id = $9`,
          [login.trim(), email.trim(), hash, !!is_admin, !!can_view_processes, !!can_query_ports, !!can_upload_cookies, ativo !== false, userId]
        );
      } else {
        await db.query(
          `UPDATE usuarios 
           SET login = $1, email = $2, is_admin = $3, can_view_processes = $4, can_query_ports = $5, can_upload_cookies = $6, ativo = $7
           WHERE id = $8`,
          [login.trim(), email.trim(), !!is_admin, !!can_view_processes, !!can_query_ports, !!can_upload_cookies, ativo !== false, userId]
        );
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso!' }));
    } catch (err) {
      console.error('Error updating user:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao atualizar usuário no banco.' }));
    }
    return;
  }

  // Endpoint 9: POST /api/admin/users/:id/reset-password
  if (reqPath.startsWith('/api/admin/users/') && reqPath.endsWith('/reset-password') && req.method === 'POST') {
    const adminUser = checkAdmin(req, res);
    if (!adminUser) return;
    
    const idStr = reqPath.substring('/api/admin/users/'.length, reqPath.length - '/reset-password'.length);
    const userId = parseInt(idStr, 10);
    if (isNaN(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ID de usuário inválido.' }));
      return;
    }
    
    try {
      const userRes = await db.query('SELECT login, email FROM usuarios WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Usuário não encontrado.' }));
        return;
      }
      
      const user = userRes.rows[0];
      if (!user.email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Usuário não possui e-mail cadastrado.' }));
        return;
      }
      
      const tempPass = Math.random().toString(36).substring(2, 8).toUpperCase();
      const hash = bcrypt.hashSync(tempPass, 10);
      
      await db.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, userId]);
      
      const subject = 'Redefinição de Senha Requerida - LPL Comissária';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Redefinição de Senha Requerida</h2>
          <p>Olá, <strong>${user.login}</strong>.</p>
          <p>O administrador solicitou o **reset da sua senha** de acesso ao Painel LPL.</p>
          <p>Use a seguinte senha temporária para acessar o sistema e cadastrar sua nova senha:</p>
          <div style="background: #f1f5f9; padding: 12px; font-size: 20px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 2px; margin: 20px 0;">
            ${tempPass}
          </div>
          <p style="color: #ef4444; font-size: 13px;"><strong>Importante:</strong> Recomendamos alterar esta senha assim que fizer o login em sua conta.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">LPL Comissária de Despachos Ltda. - Itajaí/SC</p>
        </div>
      `;
      const textBody = `Olá, ${user.login}.\n\nO administrador solicitou o reset da sua senha de acesso ao Painel LPL.\n\nSua nova senha temporária de acesso é: ${tempPass}\n\nRecomendamos alterar sua senha após efetuar o login.`;
      
      const emailSent = await enviarEmail(user.email, subject, htmlBody, textBody);
      
      if (emailSent) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Senha resetada e nova senha temporária enviada por e-mail com sucesso!' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao disparar o e-mail de redefinição. Tente novamente mais tarde.' }));
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao redefinir a senha do usuário.' }));
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
