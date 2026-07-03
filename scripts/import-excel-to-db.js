const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const db = require('../db');

function normalizeHeader(val) {
  if (!val) return '';
  return val.toString().trim()
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// Mapeamento de cabeçalhos do Excel para colunas do Banco de Dados
const headerMapping = {
  'EXP': 'exp_code',
  'EXP Nº': 'exp_code',
  'REFERÊNCIA': 'exp_code',
  'EXPORTADOR': 'exportador',
  'IMPORTADOR': 'importador',
  'NAVIO': 'navio',
  'BOOKING': 'booking',
  'DATA ESTUFAGEM': 'data_estufagem',
  'D/L DRAFT': 'dl_draft',
  'D/L CARGA': 'dl_carga',
  'ETA': 'eta',
  'ETS': 'ets',
  'ORIGEM': 'origem',
  'DESTINO': 'destino',
  'ARMADOR': 'armador',
  'CONTROLE INTERNO': 'controle_interno',
  'BYSOFT': 'bysoft',
  'RUC': 'ruc',
  'DUE/RUC': 'ruc',
  'CSI': 'csi',
  'DEPÓSITO NO PORTO': 'deposito_no_porto',
  'EM REGISTRO': 'em_registro',
  'DUE': 'due',
  'Nº DUE': 'nº_due',
  'FRONTEIRA': 'fronteira',
  'PAÍS': 'pais',
  'TRANSPORTADORA': 'transportadora',
  'CAVALO': 'cavalo',
  'CARRETA': 'carreta',
  'LIBERAÇÃO - BR': 'liberacao_br',
  'PALLETS': 'pallets',
  'TERMINAL ATRACAÇÃO': 'terminal_atracacao',
  'PRODUTO': 'produto',
  'PROTOCOLADO': 'protocolado',
};

// As colunas de processos na ordem exata de inserção
const PROCESS_COLUMNS = [
  'exp_code', 'ativo', 'origem_aba', 'exportador', 'importador', 'navio', 'booking',
  'data_estufagem', 'dl_draft', 'dl_carga', 'eta', 'ets', 'origem', 'destino', 'armador',
  'controle_interno', 'bysoft', 'ruc', 'csi', 'deposito_no_porto', 'em_registro', 'due',
  'nº_due', 'fronteira', 'pais', 'transportadora', 'cavalo', 'carreta', 'liberacao_br',
  'pallets', 'terminal_atracacao', 'produto', 'protocolado'
];

async function importExcel() {
  const filePath = path.join(__dirname, '..', 'Gestão de Processos - MARFRIG x DESPACHANTES.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo Excel não encontrado em: ${filePath}`);
    process.exit(1);
  }

  console.log(`Carregando planilha Excel de: ${filePath}...`);
  const start = Date.now();
  const workbook = XLSX.readFile(filePath);
  console.log(`Planilha carregada em ${((Date.now() - start) / 1000).toFixed(2)}s`);

  const sheetsToImport = [
    { name: 'AGUARDANDO EMBARQUE', active: true },
    { name: 'DRAFT', active: true },
    { name: 'DUE', active: true },
    { name: 'RODOVIARIO', active: true },
    { name: 'USO MARFRIG', active: true },
    { name: 'Emb. 2026', active: false },
    { name: 'Emb. 2025', active: false },
    { name: 'Emb. 2024', active: false },
    { name: 'Emb. Cancelados', active: false }
  ];

  const normalizedProcesses = {};

  for (const item of sheetsToImport) {
    const sheet = workbook.Sheets[item.name];
    if (!sheet) {
      console.log(`Aba "${item.name}" não encontrada no Excel, ignorando...`);
      continue;
    }

    console.log(`Processando aba: "${item.name}"...`);
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length < 2) continue;

    const rawHeaders = data[0];
    const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h));

    const mappings = {};
    normalizedHeaders.forEach((header, idx) => {
      if (headerMapping[header]) {
        mappings[headerMapping[header]] = idx;
      }
      
      if (header === 'CONTAINER' || header === 'CONTAINER' || header === 'CONTEINER') {
        mappings.numero_conteiner = idx;
      } else if (header === 'TEMP.' || header === 'TEMP') {
        mappings.temperatura = idx;
      } else if (header === 'AMEND') {
        mappings.amend = idx;
      } else if (header === 'ALTERAR PROVISÓRIO' || header === 'ALTERAR\nPROVISÓRIO') {
        mappings.alterar_provisorio = idx;
      }
    });

    if (mappings.exp_code === undefined) {
      console.log(`Aviso: Coluna EXP não localizada na aba "${item.name}". Pulando aba...`);
      continue;
    }

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const expVal = row[mappings.exp_code];
      if (!expVal || expVal.toString().trim() === '') continue;

      const expCode = expVal.toString().trim().toUpperCase();

      if (!normalizedProcesses[expCode]) {
        normalizedProcesses[expCode] = {
          exp_code: expCode,
          ativo: item.active,
          origem_aba: item.name,
          conteineres: []
        };
      }

      Object.keys(headerMapping).forEach(headerKey => {
        const dbCol = headerMapping[headerKey];
        if (dbCol !== 'exp_code' && mappings[dbCol] !== undefined) {
          const val = row[mappings[dbCol]];
          if (val !== undefined && val !== null) {
            normalizedProcesses[expCode][dbCol] = val.toString().trim();
          }
        }
      });

      if (mappings.numero_conteiner !== undefined) {
        const cNum = row[mappings.numero_conteiner];
        if (cNum && cNum.toString().trim() !== '' && cNum.toString().trim() !== '#N/A') {
          const numero_conteiner = cNum.toString().trim().toUpperCase();
          
          const jaExiste = normalizedProcesses[expCode].conteineres.some(c => c.numero_conteiner === numero_conteiner);
          if (!jaExiste) {
            const containerObj = { numero_conteiner };
            
            if (mappings.temperatura !== undefined && row[mappings.temperatura] !== undefined) {
              containerObj.temperatura = row[mappings.temperatura].toString().trim();
            }
            if (mappings.amend !== undefined && row[mappings.amend] !== undefined) {
              containerObj.amend = row[mappings.amend].toString().trim();
            }
            if (mappings.alterar_provisorio !== undefined && row[mappings.alterar_provisorio] !== undefined) {
              containerObj.alterar_provisorio = row[mappings.alterar_provisorio].toString().trim();
            }
            
            normalizedProcesses[expCode].conteineres.push(containerObj);
          }
        }
      }
    }
  }

  const listProcessos = Object.values(normalizedProcesses);
  console.log(`Normalização finalizada! Total de processos únicos encontrados: ${listProcessos.length}`);

  console.log('Conectando ao Supabase para gravação em lote...');
  const pool = db.pool;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Limpar processos e contêineres antigos
    console.log('Limpando registros antigos do banco...');
    await client.query('DELETE FROM conteineres');
    await client.query('DELETE FROM processos');

    // 2. Inserir processos em blocos de 500 para evitar limites de parâmetros no PostgreSQL
    console.log('Inserindo processos em lotes...');
    const expToIdMap = {};
    const chunkSize = 500;
    
    for (let i = 0; i < listProcessos.length; i += chunkSize) {
      const chunk = listProcessos.slice(i, i + chunkSize);
      
      const valueStrings = [];
      const values = [];
      let paramIndex = 1;
      
      chunk.forEach(p => {
        const rowParams = [];
        PROCESS_COLUMNS.forEach(col => {
          rowParams.push(`$${paramIndex++}`);
          values.push(p[col] !== undefined ? p[col] : null);
        });
        valueStrings.push(`(${rowParams.join(', ')})`);
      });
      
      const sql = `
        INSERT INTO processos (${PROCESS_COLUMNS.join(', ')})
        VALUES ${valueStrings.join(', ')}
        RETURNING id, exp_code
      `;
      
      const res = await client.query(sql, values);
      res.rows.forEach(row => {
        expToIdMap[row.exp_code] = row.id;
      });
      
      console.log(`  Inseridos ${Math.min(i + chunkSize, listProcessos.length)} / ${listProcessos.length} processos...`);
    }

    // 3. Agrupar todos os contêineres a serem inseridos
    const listContainers = [];
    listProcessos.forEach(p => {
      const dbProcessoId = expToIdMap[p.exp_code];
      if (dbProcessoId) {
        p.conteineres.forEach(c => {
          listContainers.push({
            processo_id: dbProcessoId,
            numero_conteiner: c.numero_conteiner,
            temperatura: c.temperatura || null,
            amend: c.amend || null,
            alterar_provisorio: c.alterar_provisorio || null
          });
        });
      }
    });

    // 4. Inserir contêineres em blocos de 1000
    console.log(`Inserindo ${listContainers.length} contêineres em lotes...`);
    const containerChunkSize = 1000;
    
    for (let i = 0; i < listContainers.length; i += containerChunkSize) {
      const chunk = listContainers.slice(i, i + containerChunkSize);
      
      const valueStrings = [];
      const values = [];
      let paramIndex = 1;
      
      chunk.forEach(c => {
        valueStrings.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(c.processo_id, c.numero_conteiner, c.temperatura, c.amend, c.alterar_provisorio);
      });
      
      const sql = `
        INSERT INTO conteineres (processo_id, numero_conteiner, temperatura, amend, alterar_provisorio)
        VALUES ${valueStrings.join(', ')}
      `;
      
      await client.query(sql, values);
      console.log(`  Inseridos ${Math.min(i + containerChunkSize, listContainers.length)} / ${listContainers.length} contêineres...`);
    }

    await client.query('COMMIT');
    console.log(`\n>>> SUCESSO: ${listProcessos.length} processos e ${listContainers.length} contêineres importados e normalizados no Supabase! <<<`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na transação de importação. Transação desfeita.', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

importExcel();
