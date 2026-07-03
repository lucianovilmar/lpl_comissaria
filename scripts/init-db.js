const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');

const SQL_CREATE_TABLES = `
-- Drop existing tables to ensure clean schema (cascade deletes dependencies)
DROP TABLE IF EXISTS conteineres CASCADE;
DROP TABLE IF EXISTS processos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 1. Create table usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    can_view_processes BOOLEAN DEFAULT TRUE,
    can_query_ports BOOLEAN DEFAULT TRUE,
    can_upload_cookies BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create table processos
CREATE TABLE processos (
    id SERIAL PRIMARY KEY,
    exp_code TEXT UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    origem_aba TEXT NOT NULL,
    exportador TEXT,
    importador TEXT,
    navio TEXT,
    booking TEXT,
    data_estufagem TEXT,
    dl_draft TEXT,
    dl_carga TEXT,
    eta TEXT,
    ets TEXT,
    origem TEXT,
    destino TEXT,
    armador TEXT,
    controle_interno TEXT,
    bysoft TEXT,
    ruc TEXT,
    csi TEXT,
    deposito_no_porto TEXT,
    em_registro TEXT,
    due TEXT,
    nº_due TEXT,
    fronteira TEXT,
    pais TEXT,
    transportadora TEXT,
    cavalo TEXT,
    carreta TEXT,
    liberacao_br TEXT,
    pallets TEXT,
    terminal_atracacao TEXT,
    produto TEXT,
    produto_cod TEXT,
    protocolado TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create table conteineres
CREATE TABLE conteineres (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
    numero_conteiner TEXT NOT NULL,
    tipo TEXT,
    tara TEXT,
    peso_bruto TEXT,
    temperatura TEXT,
    amend TEXT,
    alterar_provisorio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initializeDatabase() {
  console.log('Iniciando conexão com o banco de dados Supabase...');
  
  try {
    // 1. Criar as tabelas
    console.log('Criando tabelas (usuarios, processos, conteineres)...');
    await db.query(SQL_CREATE_TABLES);
    console.log('Tabelas criadas com sucesso!');

    // 2. Importar usuários do users.json
    const usersJsonPath = path.join(__dirname, '..', 'users.json');
    if (fs.existsSync(usersJsonPath)) {
      console.log('Carregando usuários antigos do arquivo users.json...');
      const users = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));

      for (const u of users) {
        let passwordHash;
        
        if (u.login.toUpperCase() === 'LVS') {
          // Usar o mesmo hash de senha do Green
          passwordHash = '$2b$10$U/FfDXsjYUrvvPv7aw6A1us8thbiYqNfsFRuwvDVBQujCrEKGC27S';
          console.log(`Configurando senha criptografada para o Admin: ${u.login}`);
        } else {
          // Criptografar a senha em texto plano dos outros usuários usando bcryptjs
          passwordHash = bcrypt.hashSync(u.senha, 10);
          console.log(`Criptografando senha para o usuário: ${u.login}`);
        }

        const isLvs = u.login.toUpperCase() === 'LVS';
        await db.query(
          `INSERT INTO usuarios (login, senha, email, is_admin, can_view_processes, can_query_ports, can_upload_cookies) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            u.login, 
            passwordHash, 
            u.email, 
            isLvs, // is_admin
            true,  // can_view_processes
            true,  // can_query_ports
            isLvs  // can_upload_cookies (apenas admin inicial pode sincronizar)
          ]
        );
      }
      console.log('Todos os usuários foram migrados e salvos de forma segura no banco de dados!');
    } else {
      console.log('AVISO: Arquivo users.json não encontrado. Criando apenas o usuário LVS...');
      await db.query(
        `INSERT INTO usuarios (login, senha, email, is_admin, can_view_processes, can_query_ports, can_upload_cookies) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'LVS', 
          '$2b$10$U/FfDXsjYUrvvPv7aw6A1us8thbiYqNfsFRuwvDVBQujCrEKGC27S', 
          'lucianovs.lpl@gmail.com', 
          true, true, true, true
        ]
      );
      console.log('Usuário Admin LVS criado com sucesso!');
    }

    console.log('\n>>> PROCESSO CONCLUÍDO COM SUCESSO! O BANCO DE DADOS ESTÁ PRONTO E SEGREDO CRIPTOGRAFADO! <<<');
    process.exit(0);
  } catch (err) {
    console.error('Erro crítico ao inicializar o banco de dados:', err);
    process.exit(1);
  }
}

initializeDatabase();
