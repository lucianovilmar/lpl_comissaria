# 🚀 Guia de Orientação Definitivo para a IA no Outro Projeto (LPL - Relatórios - Dashboard)

> **⚠️ REGRA DE ESCOPO (NÃO ALTERAR OUTRAS TELAS)**:
> - **NÃO altere ou substitua** o layout existente, telas de login, controle de usuários, ou a geração de relatórios já criadas no projeto **LPL - Relatórios - Dashboard**.
> - **Altere EXCLUSIVAMENTE** a tela **`Situação nos Portos`** (localizada dentro do menu **`LPL Planilha & Rastreamento`**).

---

## 📌 Prompt de Copia e Cola para o Chat do Outro Projeto

Copie e cole o texto dentro do quadro abaixo diretamente na primeira mensagem do chat do projeto **LPL - Relatórios - Dashboard**:

```text
Olá! Precisamos implementar a funcionalidade de Rastreamento de Contêineres na tela "Situação nos Portos" (dentro do menu "LPL Planilha & Rastreamento").

ATENÇÃO: Mantenha 100% intactos a tela de Login, o Controle de Usuários, o Layout Geral e a área de Relatórios existentes. Vamos trabalhar EXCLUSIVAMENTE na tela "Situação nos Portos".

Para o rastreamento dos 4 terminais portuários (TCP Paranaguá, Porto Itapoá - POA, Portonave - NAV e Tecon Rio Grande - TEC), NUNCA use dados estáticos, mockados ou fixos de imagem.

Por favor, implemente a arquitetura técnica baseada nas seguintes regras:

1. GERENCIAMENTO E VERIFICAÇÃO DE COOKIES (server.js):
   - Crie a rota `GET /api/cookies/status` que lê os arquivos `tcp-cookies.json`, `poa-cookies.json`, `nav-cookies.json` e `tec-cookies.json` na raiz do backend e responde se cada porto está "Conectado" (válido) ou "Desconectado (Sem cookies)".
   - Crie a rota `POST /api/cookies/sync` para receber e salvar os cookies de sessão enviados pelo Bookmarklet Sincronizador de 1-Clique.

2. CRAWLER DOS 4 PORTOS (ports-crawler.js):
   - Implemente as funções Puppeteer para cada terminal:
     * `queryTCP(containerCode)`: Acessa portal.tcp.com.br, preenche `input#search`, clica na tabela lateral, raspe o HTML extraindo as abas `Situação`, `Detalhes`, `Agendamento` e o Stepper de 4 Etapas (`Entrada`, `Aduaneiro`, `Embarque`, `Faturamento`).
     * `queryPOA(containerCode, bookingCode)`: Acessa clientes.portoitapoa.com, faz login se necessário, busca por Booking ou Contêiner, clica na lupa `.flaticon2-search`, abre a modal "Detalhes do Agendamento" e usa expressões regulares (Regex) para capturar data de depósito e janela de agendamento.
     * `queryNAV(containerCode)`: Consulta o status de recinto alfandegado e presença de carga na Portonave.
     * `queryTEC(containerCode)`: Consulta status e liberação SIF/RFB no Tecon.
   - Retorne objetos JSON dinâmicos com o campo `isDetailed: true`.

3. ROTA EXPRESS DE CONSULTA (server.js):
   - Crie a rota `GET /api/search?container=CODIGO&booking=BOOKING` que executa as consultas nos portos e retorna o objeto com `statuses` e o array `results`.

4. FRONTEND DA TELA "SITUAÇÃO NOS PORTOS" (app.js):
   - **Grid de Saúde dos Portos**: Renderize os 4 cards de status superiores (TCP, POA, NAV, TEC). Adicione um polling a cada 5 segundos `setInterval(fetchCookiesStatus, 5000)` chamando `/api/cookies/status` para manter os cards verdes ("Conectado") ou vermelhos ("Desconectado").
   - **Pesquisa Dinâmica**: Ao clicar em "Pesquisar", chame `fetch('/api/search?container=' + codigo)`. Exiba o loader "Buscando nos terminais portuários..." e substitua pelo Card de Rastreamento com Stepper de 4 Etapas, as 3 sub-abas (`Situação`, `Detalhes`, `Agendamento`) e o Grid KPI dinâmico.

Por favor, comece criando essa estrutura no backend e integrando o retorno dinâmico na tela "Situação nos Portos"!
```

---

## 📂 Arquivos de Referência Incluídos no Repositório

Se desejar, você pode copiar os dois arquivos técnicos completos para a raiz do seu novo projeto:

1. [`guia_tecnico_api_tcp_puppeteer.md`](file:///c:/Users/LVS%2006%20Dev/OneDrive/Desktop/projetosnodejs/LPL/site-novo/guia_tecnico_api_tcp_puppeteer.md) - Contém o código Node.js/Puppeteer completo da consulta do TCP, rotas Express e frontend.
2. [`manual_arquitetura_rastreamento_portos.md`](file:///c:/Users/LVS%2006%20Dev/OneDrive/Desktop/projetosnodejs/LPL/site-novo/manual_arquitetura_rastreamento_portos.md) - Contém o fluxo dos 4 portos (TCP, POA, NAV, TEC), verificação de cookies e o layout visual das 3 telas.
