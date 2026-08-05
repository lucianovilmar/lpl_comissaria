# Memória de Projeto: LPL Comissária (Gestão de Processos e Rastreamento)

Este arquivo serve como a memória definitiva deste projeto para guiar qualquer sessão futura da Inteligência Artificial. Ele descreve a arquitetura, regras de negócio, infraestrutura e as principais decisões de design.

> [!IMPORTANT]
> **DIFERENÇA DE PROJETOS (NÃO MISTURAR)**
> Este projeto é o **LPL Comissária (Gestão de Processos e Rastreamento)**. Ele usa um banco de dados local/Supabase para controle de usuários e rastreamento de processos e contêineres de portos.
> Ele **NÃO** é o *Portal de Relatórios LPL* (que se conecta à base da Bysoft e é um projeto à parte). Mantenha os títulos, telas, textos e configurações de banco de dados 100% isolados.

---

## 1. Escopo e Funcionalidades Core
O sistema é um painel administrativo para a LPL Comissária gerenciar processos de importação/exportação e rastrear o status físico de contêineres nos seguintes terminais portuários:
1. **TCP (Paranaguá)**: Rastreamento via crawler automatizado com cookies sincronizados.
2. **Portonave (Navegantes)**: Consulta de contêineres e escalas.
3. **Porto Itapoá (POA)** Rastreamento detalhado por booking ou contêiner, com extração de modal de agendamento (datas de entrada/depósito e fim da janela).
4. **Tecon (Rio Grande)**: Consulta integrada de status.

---

## 2. Arquitetura do Sistema

### Backend (`server.js`)
*   Servidor Node.js com Express.
*   **Portas**: Porta local padrão é `3000`. Em produção no Render, roda na porta `10000`.
*   **Rotas Principais**:
    *   `POST /api/login`: Autenticação local contra a tabela `usuarios` do Supabase.
    *   `PUT /api/profile`: Alteração de dados cadastrais (Login/Senha) do próprio usuário logado.
    *   `POST /api/forgot-password`: Gera senha temporária de 6 dígitos e envia por e-mail via SMTP.
    *   `POST /api/cookies/sync`: Recebe os cookies do portal do TCP enviados pelo bookmarklet de 1 clique, salva na nuvem e replica para o robô local via ngrok.
    *   `GET /api/cookies/status`: Retorna se o status do TCP está "Conectado" com base na validade dos arquivos de cookies.
    *   `POST /api/admin/users`: CRUD de controle de acesso (apenas para administradores).

### Banco de Dados (`db.js`)
*   Hospedado no Supabase (Postgres).
*   Tabelas Principais:
    *   `usuarios`: Armazena login, senha (hash bcrypt), email, nível administrativo (`is_admin`), status (`ativo`), e a flag `requer_redefinicao`.
    *   `processos`: Dados gerais de processos vinculados a bookings/contêineres.
    *   `conteineres`: Vinculados aos processos para rastreamento físico.

### Frontend (`app.js` e `index.html`)
*   Interface SPA (Single Page Application) construída em vanilla HTML e Javascript, com estilização em `styles.css`.
*   **Controle de Login**: Login Wall integrado na entrada do site.
*   **Barra Lateral (Sidebar)**: Dinâmica, adaptando os menus liberados de acordo com as permissões do usuário logado (armazenadas em JWT no `sessionStorage`).
*   **Assinatura de Desenvolvedor**: Rodapé do login wall contém a pílula *"Desenvolvido por LVS Tech Solutions Ltda."* com o escudo oficial.

---

## 3. Fluxos de Segurança Específicos

### Bloqueio e Redirecionamento da Vercel
*   Caso o domínio acessado contenha `.vercel.app` (antiga hospedagem legada onde as APIs e crawlers não funcionam), o frontend no topo de `app.js` substitui o DOM por um alerta de migração e redireciona o navegador após 4 segundos para a hospedagem oficial: **`https://lpl-comissaria.onrender.com`**.
*   Isso previne tentativas inválidas de login que travariam ou gastariam senhas temporárias.

### Redefinição Obrigatória de Senha
*   A coluna `requer_redefinicao` (boolean) é ativada quando:
    *   Um usuário esquece a senha e solicita redefinição.
    *   O admin cria um novo usuário sem senha ou executa o reset administrativo de senha.
*   Ao logar com a senha temporária, a interface é bloqueada: todos os links da barra lateral são ocultados, as rotas manuais via hashtag direcionam para o perfil e o botão "Cancelar" na tela "Meu Perfil" é removido. O usuário é forçado a definir uma nova senha definitiva para reestabelecer o acesso completo ao painel.

### Resolução de Rede de E-mail (SMTP) na Nuvem
*   Devido às restrições do Render de saída IPv6, configurou-se a resolução de DNS do Node globalmente no topo de `server.js` para priorizar conexões IPv4:
    ```javascript
    dns.setDefaultResultOrder('ipv4first');
    ```
    Isso garante o envio estável e imediato de e-mails automáticos pelo Nodemailer via SMTP do Gmail.

---

## 4. Integração Scraper e Agente Local (ngrok)
*   **Problema de WAF (Cloudflare/TCP)**: Portais portuários bloqueiam consultas headless vindas de IPs de servidores na nuvem (como os do Render).
*   **Solução Local Scraper**: As consultas reais de contêineres e bookings no TCP são repassadas a um robô local (Puppeteer) rodando no escritório do cliente através de um túnel seguro (ngrok).
*   O servidor na nuvem se comunica com o scraper local por chamadas do Express, enviando os cookies TCP ativos capturados no navegador do cliente por meio de um Bookmarklet (favorito) injetado com um script de captura de 1 clique.
*   **Arquivos de Cookies**: `tcp-cookies.json`, `poa-cookies.json`, `nav-cookies.json`, `tec-cookies.json` armazenados localmente e atualizados pelas credenciais ativas do portal.
*   **Crawler Porto Itapoá (POA)**: Acessa e navega no painel client-side do terminal, aguarda a tabela de resultados, clica na lupa (`.flaticon2-search`), seleciona "Detalhes do Agendamento" e extrai informações via expressão regular para montar a timeline detalhada do contêiner.

---

## 5. Como rodar o projeto localmente
1. Certifique-se de que as variáveis de ambiente necessárias estejam corretas no arquivo `.env`.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor Express:
   ```bash
   node server.js
   ```
4. O painel estará disponível na porta `3000` (`http://localhost:3000`).
