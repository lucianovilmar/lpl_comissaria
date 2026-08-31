# 🚀 Guia de Orientação para a IA no Outro Projeto (LPL - Relatórios - Dashboard)

> **Mapeamento de Telas**:
> - **Projeto Atual (LPL Comissária)**: Módulo **`LPL Planilha & Rastreamento`** (Consulta de Contêineres).
> - **Novo Projeto (LPL - Relatórios - Dashboard)**: Tela **`Situação nos Portos`** (dentro de **`LPL Planilha & Rastreamento`**).

Para garantir que a Inteligência Artificial no outro projeto entenda perfeitamente a arquitetura e implemente a consulta **REAL da API/Portal do TCP Paranaguá** na tela **`Situação nos Portos`** (sem usar dados estáticos ou fictícios de imagem), siga as instruções abaixo.

---

## 📌 Opção 1: Copiar o Prompt Pronto abaixo no outro chat

Copie e cole o texto dentro do quadro abaixo diretamente na primeira mensagem do chat do projeto **LPL - Relatórios - Dashboard**:

```text
Olá! Para a tela "Situação nos Portos" (dentro de "LPL Planilha & Rastreamento"), referente ao Rastreamento de Contêineres no TCP Paranaguá, NUNCA use dados estáticos, mockados ou fixos de imagem.

Precisamos implementar a consulta REAL e DINÂMICA via Puppeteer no Node.js usando cookies de sessão ativas do portal TCP.

Por favor, implemente a arquitetura técnica baseada nas seguintes regras:

1. BACKEND (ports-crawler.js):
   - Crie a função `queryTCP(containerCode)` utilizando Puppeteer em modo headless (`headless: true`).
   - Carregue o arquivo de cookies `tcp-cookies.json`.
   - Aplique evasão de WAF (`navigator.webdriver = undefined`).
   - Navegue para `https://portal.tcp.com.br/consulta-geral/conteineres`.
   - Preencha o input `input#search` com o código do contêiner e execute a busca.
   - Clique no link da tabela lateral `app-conteiner-side-table a` para abrir o painel de detalhes.
   - Raspe o HTML do Angular Material extraindo as 3 sub-abas:
     * Situação: pares chave-valor (Número, Data Cadastro, Data Entrada, Data Saída, Status, Navio/Serviço, etc.).
     * Detalhes: peso bruto, tipo ISO e tabela de documentos.
     * Agendamento: timeline do portão (Agendamento, SAV, Entrada Gate, Operação, Saída Gate).
     * Stepper de 4 Etapas: Entrada, Aduaneiro, Embarque, Faturamento.
   - Retorne o objeto JSON estruturado com o campo `isDetailed: true`.

2. ROTA EXPRESS (server.js):
   - Crie a rota `GET /api/search?container=CODIGO` que chama `queryTCP(containerCode)` e responde com `{ statuses: { tcp: { status: 'success', message: 'Sucesso' } }, results: [resultadoJSON] }`.

3. FRONTEND DA TELA "SITUAÇÃO NOS PORTOS" (app.js):
   - Faça a requisição HTTP real `fetch('/api/search?container=' + codigo)`.
   - Ao receber o JSON do backend, NÃO exiba dados estáticos. Monte os cards dinamicamente iterando sobre as chaves do objeto `results[0].situacao`.
   - Renderize o Stepper visual de 4 etapas e as 3 sub-abas (`Situação`, `Detalhes`, `Agendamento`).

Por favor, comece estruturando essa consulta real no backend e integrando o retorno dinâmico na tela "Situação nos Portos"!
```

---

## 📂 Opção 2: Copiar o arquivo `guia_tecnico_api_tcp_puppeteer.md` para a pasta do outro projeto

Se preferir, você pode copiar os dois arquivos de documentação criados aqui para a pasta raiz do outro projeto:

1. [`guia_tecnico_api_tcp_puppeteer.md`](file:///c:/Users/LVS%2006%20Dev/OneDrive/Desktop/projetosnodejs/LPL/site-novo/guia_tecnico_api_tcp_puppeteer.md)
2. [`manual_arquitetura_rastreamento_portos.md`](file:///c:/Users/LVS%2006%20Dev/OneDrive/Desktop/projetosnodejs/LPL/site-novo/manual_arquitetura_rastreamento_portos.md)

Depois de colocar os arquivos na pasta do outro projeto, envie a seguinte mensagem para a IA de lá:

> *"Por favor, leia os arquivos `guia_tecnico_api_tcp_puppeteer.md` e `manual_arquitetura_rastreamento_portos.md` localizados na raiz do projeto. Neles consta o código Node.js/Puppeteer completo da função `queryTCP`, a rota `/api/search` e a renderização do frontend para a tela Situação nos Portos. Siga exatamente essa especificação para realizar a consulta real nos portos sem usar dados mockados."*

---

### 🔥 O que isso vai garantir?
- A IA do outro projeto saberá exatamente que a tela **`Situação nos Portos`** usa **raspagem headless em tempo real**.
- Ela não tentará adivinhar ou colocar dados estáticos da imagem.
- O resultado final na tela **`Situação nos Portos`** do seu novo Dashboard ficará idêntico a este site funcional!
