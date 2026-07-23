// --- SISTEMA DE AUTENTICAÇÃO E PERMISSÕES ---
const greenAccessPassword = 'Luiggi9654';
const greenTestSampleData = [
  { id: 1, pedido:'0001', cliente:'Cliente A', cnpj:'12.345.678/0001-90', valor: 2450.50, status:'pendente' },
  { id: 2, pedido:'0002', cliente:'Cliente B', cnpj:'98.765.432/0001-10', valor: 1780.75, status:'em processamento' }
];

let contentArea = document.getElementById('content-area');

function checkAuth() {
  const token = sessionStorage.getItem('lpl_token');
  const loginWall = document.getElementById('login-wall');
  const mainApp = document.getElementById('main-app');
  
  if (!token) {
    if (loginWall) loginWall.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    renderLoginWall();
  } else {
    if (loginWall) loginWall.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    
    // Recapturar o content-area no DOM caso tenha mudado
    contentArea = document.getElementById('content-area');
    setupSidebar();
  }
}

function logout() {
  sessionStorage.clear();
  checkAuth();
}

function setupSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  
  // Limpar a barra lateral e recriar dinamicamente conforme as permissões
  sidebar.innerHTML = '';
  
  // 1. Due (Livre para todos)
  sidebar.innerHTML += `<button class="nav-btn" data-page="due">Due</button>`;
  
  // 2. Calculo de Itens (Livre para todos)
  sidebar.innerHTML += `<button class="nav-btn" data-page="teste">Calculo de Itens</button>`;
  
  // 4. LPL Planilha & Gestão (Somente se can_view_processes for true)
  if (sessionStorage.getItem('lpl_can_view_processes') === 'true') {
    sidebar.innerHTML += `<button class="nav-btn" data-page="planilha">Gerar Planilha</button>`;
    sidebar.innerHTML += `<button class="nav-btn" data-page="gestao-processos">Gestão de Processos</button>`;
  }
  
  // 5. Consulta Portos (Somente se can_query_ports for true)
  if (sessionStorage.getItem('lpl_can_query_ports') === 'true') {
    sidebar.innerHTML += `<button class="nav-btn" data-page="lpl-planilha">LPL Planilha</button>`;
  }
  
  // 6. Painel Admin (Relocado para a área do usuário abaixo)

  // 7. Info do Usuário + Botão Sair (Logout)
  const loggedInUser = sessionStorage.getItem('lpl_user') || 'Usuário';
  const isAdmin = sessionStorage.getItem('lpl_is_admin') === 'true';
  const adminBtnHtml = isAdmin ? `
    <button class="nav-btn" data-page="admin" style="border-left: 3px solid var(--btn-active-bg); font-weight: 600; margin-bottom: 8px;">Painel Admin</button>
  ` : '';

  sidebar.innerHTML += `
    <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
      <div style="padding: 10px 12px; font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 18px;">👤</span>
        <div style="display: flex; flex-direction: column; overflow: hidden;">
          <span id="sidebarUserProfileBtn" style="font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; text-decoration: underline; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--btn-active-bg)'" onmouseout="this.style.color='var(--text)'" title="Ver Perfil">${loggedInUser}</span>
          <span style="font-size: 10px; color: var(--muted);">LPL Comissária</span>
        </div>
      </div>
      ${adminBtnHtml}
      <button class="nav-btn" id="logoutBtn" style="margin-top: 0; color: #ef4444; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
        <span>Sair</span> <span>🚪</span>
      </button>
    </div>
  `;
  
  const navButtons = sidebar.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.id === 'logoutBtn') {
      btn.addEventListener('click', logout);
      return;
    }
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPage(btn.dataset.page);
    });
  });

  const sidebarUserProfileBtn = sidebar.querySelector('#sidebarUserProfileBtn');
  if (sidebarUserProfileBtn) {
    sidebarUserProfileBtn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      loadPage('perfil');
    });
  }
  
  // Selecionar Due como padrão inicialmente
  const dueBtn = sidebar.querySelector('[data-page="due"]');
  if (dueBtn) {
    dueBtn.classList.add('active');
    loadPage('due');
  }
}

function renderLoginWall(alertHtml = '') {
  const loginWall = document.getElementById('login-wall');
  if (!loginWall) return;
  
  loginWall.innerHTML = `
    <div class="login-card">
      <img src="assets/LPL%20-%20logo.png" alt="LPL Logo" class="login-logo" onerror="this.onerror=null;this.src='assets/placeholder.svg';">
      <h2 class="login-title">LPL Comissária</h2>
      <p class="login-subtitle">Gestão de Processos e Rastreamento</p>
      
      ${alertHtml}
      
      <form id="loginForm" class="login-form">
        <div class="field">
          <label for="usernameInput">Usuário ou E-mail</label>
          <input type="text" id="usernameInput" required placeholder="Digite seu usuário ou e-mail">
        </div>
        
        <div class="field">
          <label for="passwordInput">Senha</label>
          <div class="password-wrapper">
            <input type="password" id="passwordInput" required placeholder="Digite sua senha">
            <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('passwordInput', this)" tabIndex="-1">👁️</button>
          </div>
        </div>
        
        <div class="login-links" style="display: flex; justify-content: flex-end; margin-top: -6px; margin-bottom: 6px;">
          <button type="button" class="login-link" onclick="renderForgotPasswordForm()">Esqueceu sua senha?</button>
        </div>
        
        <button type="submit" class="login-btn">Entrar</button>
      </form>
      
      <div class="login-footer">
        LPL Comissária de Despachos Ltda.<br>
        Matriz: Itajaí/SC — Filial: Rio Grande/RS
      </div>
    </div>
  `;
  
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('usernameInput').value.trim();
      const senha = document.getElementById('passwordInput').value;
      const btn = form.querySelector('.login-btn');
      
      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, senha })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
          sessionStorage.setItem('lpl_token', result.token);
          sessionStorage.setItem('lpl_user', result.user);
          sessionStorage.setItem('lpl_is_admin', String(result.is_admin));
          sessionStorage.setItem('lpl_can_view_processes', String(result.can_view_processes));
          sessionStorage.setItem('lpl_can_query_ports', String(result.can_query_ports));
          sessionStorage.setItem('lpl_can_upload_cookies', String(result.can_upload_cookies));
          
          checkAuth();
        } else {
          renderLoginWall(`<div class="login-alert login-alert-danger">${result.message || 'Usuário ou senha incorretos.'}</div>`);
        }
      } catch (err) {
        console.error(err);
        renderLoginWall('<div class="login-alert login-alert-danger">Erro de rede. Verifique a conexão com o servidor.</div>');
      }
    });
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '👁️‍🗨️';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function renderForgotPasswordForm(alertHtml = '') {
  const loginWall = document.getElementById('login-wall');
  if (!loginWall) return;
  
  loginWall.innerHTML = `
    <div class="login-card">
      <img src="assets/LPL%20-%20logo.png" alt="LPL Logo" class="login-logo" onerror="this.onerror=null;this.src='assets/placeholder.svg';">
      <h2 class="login-title">Recuperação de Senha</h2>
      <p class="login-subtitle">Informe seus dados para recuperar o acesso</p>
      
      ${alertHtml}
      
      <form id="forgotForm" class="login-form">
        <div class="field">
          <label for="forgotLoginInput">Usuário ou E-mail</label>
          <input type="text" id="forgotLoginInput" required placeholder="Digite seu usuário ou e-mail cadastrado">
        </div>
        
        <button type="submit" class="login-btn">Enviar Senha por E-mail</button>
        <button type="button" class="login-btn-secondary" onclick="renderLoginWall()">Voltar para o Login</button>
      </form>
      
      <div class="login-footer">
        LPL Comissária de Despachos Ltda.<br>
        Matriz: Itajaí/SC — Filial: Rio Grande/RS
      </div>
    </div>
  `;
  
  const form = document.getElementById('forgotForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('forgotLoginInput').value.trim();
      const btn = form.querySelector('.login-btn');
      
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      
      try {
        const response = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
          renderForgotPasswordForm(`<div class="login-alert login-alert-success">${result.message}</div>`);
        } else {
          renderForgotPasswordForm(`<div class="login-alert login-alert-danger">${result.error || 'Erro ao processar solicitação.'}</div>`);
        }
      } catch (err) {
        console.error(err);
        renderForgotPasswordForm('<div class="login-alert login-alert-danger">Erro de rede. Verifique a conexão com o servidor.</div>');
      }
    });
  }
}

function loadPage(page){
  if(page === 'due') renderDue();
  else if(page === 'planilha') renderPlanilha();
  else if(page === 'green') renderGreenTest();
  else if(page === 'lpl-planilha') renderLplPlanilha();
  else if(page === 'gestao-processos') renderGestaoProcessos();
  else if(page === 'admin') renderAdmin();
  else if(page === 'perfil') renderPerfil();
  else renderTeste();
}

// Render da página Due (padrão)
function renderDue(){
  contentArea.innerHTML = `
    <div class="card">
      <h2>Conversão e Cálculos</h2>
      <div class="row">
        <div class="field field-large">
          <label>Valor da nota</label>
          <input id="valorNota" type="text" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="field field-small">
          <label>Taxa da moeda</label>
          <input id="taxaMoeda" type="text" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="output" id="valorConvertido">Valor convertido: 0,00</div>
      </div>

      <hr>

      <div class="row">
        <div class="field field-small">
          <label>Peso líquido</label>
          <input id="pesoLiquido" type="text" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="field field-small">
          <label>Valor unitário</label>
          <input id="valorUnitario" type="text" inputmode="decimal" placeholder="0,00">
        </div>
        <div style="display:flex;gap:12px;min-width:240px">
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="small">Total (formatado com separador de milhares)</div>
            <div class="output" id="totalComMilhares">0,00</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="small">Total (sem separador de milhares)</div>
            <div class="output" id="totalSemMilhares">0,00</div>
          </div>
        </div>
      </div>

      <hr>

      <div style="display:flex; align-items:center;">
        <div style="width:180px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <div style="margin-bottom:5px; font-weight:bold;">Converter</div>
          <div style="display:flex; align-items:center; gap:5px;">
            <span>Não</span>
            <label style="position:relative; display:inline-block; width:40px; height:22px;">
              <input type="checkbox" id="swConverter" style="opacity:0; width:0; height:0;">
              <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.4s; border-radius:22px;"></span>
              <span class="knob" style="position:absolute; content:''; height:16px; width:16px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
            </label>
            <span>Sim</span>
          </div>
          <style>
            #swConverter:checked + .slider { background-color: #2196F3; }
            #swConverter:checked + .slider + .knob { transform: translateX(18px); }
          </style>
        </div>      
        <div style="flex:1">
          <div class="row">
            <div class="field field-small">
              <label>Frete</label>
              <input id="frete" type="text" inputmode="decimal" placeholder="0,00">
            </div>
            <div style="display:flex;gap:12px;min-width:240px">
              <div style="display:flex;flex-direction:column;gap:6px">
                <div class="small">Frete (sem separador de milhares)</div>
                <div class="output" id="freteConvertido">0,00</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <div class="small">Frete (com separador de milhares)</div>
                <div class="output" id="freteComMilhares">0,00</div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="field field-small">
              <label>Seguro</label>
              <input id="seguro" type="text" inputmode="decimal" placeholder="0,00">
            </div>
            <div style="display:flex;gap:12px;min-width:240px">
              <div style="display:flex;flex-direction:column;gap:6px">
                <div class="small">Seguro (sem separador de milhares)</div>
                <div class="output" id="seguroConvertido">0,00</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <div class="small">Seguro (com separador de milhares)</div>
                <div class="output" id="seguroComMilhares">0,00</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <hr>

      <div class="row">
        <div style="display:flex;gap:12px;min-width:240px">
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="small">VMLE (com separador de milhares)</div>
            <div class="output" id="finalComMilhares">0,00</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="small">VMLE (sem separador de milhares)</div>
            <div class="output" id="finalSemMilhares">0,00</div>
          </div>
        </div>
      </div>

      <hr>

      
      
    </div>
  `;

  attachDueEvents();
}

function renderPlanilha(){
  contentArea.innerHTML = `
    <div class="card">
      <h2>Gerar Planilha</h2>
      
      <div class="row">
        <div class="field" style="width:100%">
          <label>Arquivos XML</label>
          <input id="xmlInput" type="file" multiple accept=".xml" style="width:100%">
        </div>
      </div>
      <div class="row" style="justify-content:flex-end; margin-bottom:10px;">
        <button id="btnLimparXML" class="nav-btn" style="margin:0; width:auto;">Limpar Dados</button>
      </div>

      <div class="row" style="align-items:center; margin-top:15px; margin-bottom:15px;">
        <div style="margin-right:10px; font-weight:bold;">Modo:</div>
        <div style="display:flex; align-items:center; gap:5px;">
          <span>Novo</span>
          <label style="position:relative; display:inline-block; width:40px; height:22px;">
            <input type="checkbox" id="swModeAppend" style="opacity:0; width:0; height:0;">
            <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.4s; border-radius:22px;"></span>
            <span class="knob" style="position:absolute; content:''; height:16px; width:16px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
          </label>
          <span>Adicionar</span>
        </div>
        <style>
          #swModeAppend:checked + .slider { background-color: #2196F3; }
          #swModeAppend:checked + .slider + .knob { transform: translateX(18px); }
        </style>
      </div>

      <div class="row" id="appendRow" style="display:none;">
        <div class="field" style="width:100%">
          <label>Planilha Existente (.xlsx)</label>
          <input id="xlsxInput" type="file" accept=".xlsx" style="width:100%">
        </div>
      </div>

      <div class="row">
        <button id="btnImportar" class="nav-btn active" style="margin:0;">Importar</button>
      </div>

      <div class="row" style="margin-top:20px;">
        <div id="previewArea" style="width:100%; height:33vh; border:1px solid #ccc; border-radius:4px; overflow:auto; padding:10px; background:rgba(255,255,255,0.05);">
          <div style="text-align:center; color:#888; margin-top:20px;">Dados Detalhados</div>
        </div>
      </div>

      <div class="row" style="margin-top:20px;">
        <div id="previewAreaSummary" style="width:100%; height:33vh; border:1px solid #ccc; border-radius:4px; overflow:auto; padding:10px; background:rgba(255,255,255,0.05);">
          <div style="text-align:center; color:#888; margin-top:20px;">Resumo por CNPJ e Produto</div>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end; margin-top:10px;">
        <button id="btnExportar" class="nav-btn active" style="margin:0;">Exportar</button>
      </div>
    </div>
  `;
  attachPlanilhaEvents();
}

function attachPlanilhaEvents(){
  const swModeAppend = document.getElementById('swModeAppend');
  const appendRow = document.getElementById('appendRow');
  const btnImportar = document.getElementById('btnImportar');
  const xmlInput = document.getElementById('xmlInput');
  const previewArea = document.getElementById('previewArea');
  const previewAreaSummary = document.getElementById('previewAreaSummary');
  const btnExportar = document.getElementById('btnExportar');
  const xlsxInput = document.getElementById('xlsxInput');
  const btnLimparXML = document.getElementById('btnLimparXML');

  // Pre-carregar biblioteca ExcelJS para exportação com estilos fiéis
  if(!window.ExcelJS){
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js').catch(console.error);
  }

  if(swModeAppend){
    swModeAppend.addEventListener('change', () => {
      appendRow.style.display = swModeAppend.checked ? 'flex' : 'none';
    });
  }

  if(btnLimparXML){
    btnLimparXML.addEventListener('click', () => {
      window.currentPlanilhaData = [];
      if(xmlInput) xmlInput.value = '';
      if(previewArea) previewArea.innerHTML = '<div style="text-align:center; color:#888; margin-top:20px;">Dados Detalhados</div>';
      if(previewAreaSummary) previewAreaSummary.innerHTML = '<div style="text-align:center; color:#888; margin-top:20px;">Resumo por CNPJ e Produto</div>';
      alert('Dados limpos com sucesso.');
    });
  }

  if(btnImportar && xmlInput){
    btnImportar.addEventListener('click', async () => {
      const files = xmlInput.files;
      if(!files || files.length === 0){
        alert('Por favor, selecione pelo menos um arquivo XML.');
        return;
      }

      previewArea.innerHTML = '<div style="padding:10px; text-align:center;">Processando arquivos...</div>';
      
      try {
        const allData = window.currentPlanilhaData || [];
        const existingFiles = new Set(allData.map(d => d.Arquivo));
        let hasNew = false;

        for(let i=0; i<files.length; i++){
          if(existingFiles.has(files[i].name)) continue;

          const text = await readFileAsText(files[i]);
          const items = parseNFeXML(text, files[i].name);
          allData.push(...items);
          hasNew = true;
        }
        renderPreviewTables(allData);
        // Salvar em variável global se necessário para exportação futura
        window.currentPlanilhaData = allData;
        
        if(!hasNew && files.length > 0) alert('Arquivos já adicionados anteriormente.');
      } catch(error){
        console.error(error);
        previewArea.innerHTML = '<div style="padding:10px; color:red;">Erro ao processar arquivos. Verifique o console.</div>';
      }
    });
  }

  if(btnExportar){
    btnExportar.addEventListener('click', async () => {
      // Carregar ExcelJS para exportação
      if(!window.ExcelJS) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
      }
      
      // Carregar XLSX (SheetJS) apenas se for necessário ler arquivo existente (Append Mode)
      if(swModeAppend && swModeAppend.checked && !window.XLSX){
         await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      }

      let finalData = window.currentPlanilhaData || [];

      // Modo Adicionar: Ler planilha existente
      if(swModeAppend && swModeAppend.checked){
        if(xlsxInput && xlsxInput.files.length > 0){
          try {
            const existingData = await readExcelFile(xlsxInput.files[0]);
            finalData = [...existingData, ...finalData];
          } catch(e){
            console.error(e);
            alert('Erro ao ler a planilha existente. Verifique se é um arquivo .xlsx válido.');
            return;
          }
        } else {
          alert('Selecione uma planilha existente para adicionar os dados.');
          return;
        }
      }

      if(finalData.length === 0){
        alert('Não há dados para exportar.');
        return;
      }

      try {
        await generateMinervaExcel(finalData);
      } catch(e){
        console.error(e);
        alert('Erro ao gerar o arquivo Excel: ' + e.message);
      }
    });
  }
}

function renderTeste(){
  contentArea.innerHTML = `
    <div class="card">
      <h2>Calculo de Itens</h2>
      <div class="row">
        <div class="field" style="flex:3; margin-right:10px;">
          <label>Texto Original</label>
          <textarea id="txtInput" rows="5" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px;"></textarea>
        </div>
        <div class="field" style="flex:1;">
          <label>Taxa da moeda</label>
          <input id="taxaMoedaTeste" type="text" inputmode="decimal" placeholder="0,00" style="width:100%; box-sizing:border-box;">
        </div>
      </div>
      <div class="row" style="align-items:flex-end;">
        <div class="field field-small">
          <label>Separador (padrão: Tab)</label>
          <input id="txtSeparator" type="text" placeholder="Tab">
        </div>
        <div class="field field-small">
          <button id="btnProcessar" class="nav-btn active" style="margin:0; width:100%; justify-content:center;">Processar</button>
        </div>
      </div>
      <div class="row" style="display:flex; gap:10px;">
        <div class="field" style="flex:1;">
          <label>Coluna 1</label>
          <input id="txtCol1" type="text" placeholder="Ex: A" style="width:100%; box-sizing:border-box;">
          <textarea id="txtOutput1" rows="10" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px; background-color:#f5f5f5;" readonly></textarea>
        </div>
        <div class="field" style="flex:1;">
          <label>Coluna 2</label>
          <input id="txtCol2" type="text" placeholder="Ex: B" style="width:100%; box-sizing:border-box;">
          <textarea id="txtOutput2" rows="10" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px; background-color:#f5f5f5;" readonly></textarea>
        </div>
        <div class="field" style="flex:1;">
          <label>Coluna 3 (Calculado)</label>
          <div style="height:21px; margin-bottom:3px;"></div>
          <textarea id="txtOutput3" rows="10" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px; background-color:#f5f5f5;" readonly></textarea>
        </div>
      </div>
      <div class="row">
        <div class="output" id="vmcvOutput" style="font-weight:bold; font-size:1.2em; margin-top:10px;">VMCV: 0,00</div>
      </div>
    </div>
  `;
  attachTesteEvents();
}

function renderGreenTest(){
  contentArea.innerHTML = `
    <div class="card green-card">
      <h2>Green Teste</h2>
      <div class="row">
        <div class="field" style="width:100%;">
          <label>Descrição</label>
          <div class="output" style="text-align:left;">
            Esta é a área de teste para migração entre sistemas. A senha correta abre a página de exemplo e mostra o JSON de dados preparado para envio.
          </div>
        </div>
      </div>
      <div class="row" style="gap:12px; flex-wrap:wrap;">
        <button id="btnShowJson" class="nav-btn active" style="margin:0; min-width:180px;">Mostrar JSON de Exemplo</button>
        <button id="btnCopyJson" class="nav-btn" style="margin:0; min-width:180px;">Copiar JSON</button>
        <button id="btnSimulateSend" class="nav-btn" style="margin:0; min-width:180px;">Simular Envio</button>
      </div>
      <div class="row">
        <textarea id="greenJsonOutput" rows="12" readonly style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #ccc; border-radius:8px; background:rgba(255,255,255,0.04);"></textarea>
      </div>
      <div class="row">
        <div id="greenStatus" class="output" style="width:100%; text-align:left; min-height:48px;">
          Status: pronto para preparar o JSON de migração.
        </div>
      </div>
      <div class="row">
        <div class="field" style="width:100%;">
          <label>Próximos passos</label>
          <div class="output" style="text-align:left;">
            Quando o banco de dados estiver disponível, essa área será usada para montar o JSON final e enviar para a API do cliente.<br>
            Veja a documentação do cliente aqui: <a href="https://documenter.getpostman.com/view/10967937/2s8YzNzis3#intro" target="_blank">Postman</a>.
          </div>
        </div>
      </div>
    </div>
  `;
  attachGreenTestEvents();
}

function attachGreenTestEvents(){
  const btnShowJson = document.getElementById('btnShowJson');
  const btnCopyJson = document.getElementById('btnCopyJson');
  const greenJsonOutput = document.getElementById('greenJsonOutput');
  const sampleJson = JSON.stringify(greenTestSampleData, null, 2);

  if(greenJsonOutput) greenJsonOutput.value = sampleJson;

  if(btnShowJson){
    btnShowJson.addEventListener('click', () => {
      if(greenJsonOutput) greenJsonOutput.value = sampleJson;
    });
  }

  if(btnCopyJson){
    btnCopyJson.addEventListener('click', async () => {
      if(!greenJsonOutput) return;
      try {
        await navigator.clipboard.writeText(greenJsonOutput.value);
        alert('JSON copiado para a área de transferência.');
      } catch (error) {
        alert('Não foi possível copiar o JSON automaticamente.');
      }
    });
  }

  const btnSimulateSend = document.getElementById('btnSimulateSend');
  const greenStatus = document.getElementById('greenStatus');
  if(btnSimulateSend){
    btnSimulateSend.addEventListener('click', () => {
      if(greenStatus) greenStatus.textContent = 'Simulação: ainda não há acesso ao banco. Futuro envio para API do cliente.';
      alert('Simulação concluída. Quando o banco estiver disponível, implementaremos o envio via API.');
    });
  }
}

function attachTesteEvents(){
  const txtInput = document.getElementById('txtInput');
  const taxaMoedaTeste = document.getElementById('taxaMoedaTeste');
  const txtSeparator = document.getElementById('txtSeparator');
  const btnProcessar = document.getElementById('btnProcessar');
  const vmcvOutput = document.getElementById('vmcvOutput');
  
  const txtCol1 = document.getElementById('txtCol1');
  const txtOutput1 = document.getElementById('txtOutput1');
  const txtCol2 = document.getElementById('txtCol2');
  const txtOutput2 = document.getElementById('txtOutput2');
  const txtOutput3 = document.getElementById('txtOutput3');

  // Máscara para o campo Taxa (igual ao Due)
  taxaMoedaTeste.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9,]/g, '');
  });
  taxaMoedaTeste.addEventListener('keydown', (e) => {
    if ((e.key === ',' || e.key === '.') && taxaMoedaTeste.value.includes(',')) {
      e.preventDefault();
      return;
    }
    if (e.key === '.') {
      e.preventDefault();
      const start = taxaMoedaTeste.selectionStart;
      const end = taxaMoedaTeste.selectionEnd;
      taxaMoedaTeste.value = taxaMoedaTeste.value.substring(0, start) + ',' + taxaMoedaTeste.value.substring(end);
      taxaMoedaTeste.selectionStart = taxaMoedaTeste.selectionEnd = start + 1;
    }
  });

  btnProcessar.addEventListener('click', () => {
    const text = (txtInput.value || '').trim();
    const taxaVal = parseFloat((taxaMoedaTeste.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
    let sep = txtSeparator.value || '\t';

    let lines = text.split('\n');

    // Lógica inteligente para identificar padrão de Nota Fiscal (NCM/CST/CFOP)
    // Verifica se o texto contém o padrão de 8 dígitos + 3 dígitos + 4 dígitos (NCM CST CFOP)
    const invoicePatternRegex = /\d{8}\s+\d{3}\s+\d{4}/;
    const hasInvoicePattern = invoicePatternRegex.test(text);

    if (sep === '\t' && hasInvoicePattern) {
      const newLines = [];
      let buffer = '';
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        const candidate = buffer ? (buffer + ' ' + line) : line;
        
        // Regex para capturar NCM(8) CST(3) CFOP(4)
        const match = candidate.match(/(\d{8})\s+(\d{3})\s+(\d{4})/);

        if (match) {
          const ncmIdx = match.index;
          const before = candidate.substring(0, ncmIdx).trim();
          const after = candidate.substring(ncmIdx).trim();

          // Separar Código e Descrição (assumindo que código é a primeira palavra)
          const firstSpace = before.indexOf(' ');
          let code = before;
          let desc = '';
          if(firstSpace > 0){
            code = before.substring(0, firstSpace).trim();
            desc = before.substring(firstSpace).trim();
          }

          // Separar o restante (NCM, CST, CFOP, UNID, QUANT...)
          const parts = after.split(/\s+/);
          const rest = parts.join('\t');

          newLines.push(`${code}\t${desc}\t${rest}`);
          buffer = ''; 
        } else {
          if (/^\d+/.test(line)) {
            if(buffer) newLines.push(buffer);
            buffer = line;
          } else {
            if(buffer) buffer += ' ' + line;
            else newLines.push(line);
          }
        }
      }
      if(buffer) newLines.push(buffer);
      lines = newLines;
    }

    // Função auxiliar para pegar índice da coluna
    const getColIndex = (str) => {
      let colStr = str ? str.trim().toUpperCase() : '';
      if(!colStr) return -1;
      let colIndex = parseInt(colStr);
      if(isNaN(colIndex)){
        colIndex = 0;
        for(let i=0; i<colStr.length; i++){
          colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
        }
      }
      return colIndex < 1 ? 1 : colIndex;
    };

    const idx1 = getColIndex(txtCol1.value);
    const idx2 = getColIndex(txtCol2.value);

    const res1 = [];
    const res2 = [];
    const res3 = [];
    let totalVMCV = 0;

    lines.forEach(line => {
      const parts = line.split(sep);
      
      const raw1 = idx1 > 0 ? (parts[idx1-1] || '').trim() : '';
      const raw2 = idx2 > 0 ? (parts[idx2-1] || '').trim() : '';

      const val1 = parseFloat(raw1.replace(/\./g, '').replace(',', '.')) || 0;
      const val2 = parseFloat(raw2.replace(/\./g, '').replace(',', '.')) || 0;

      // Cálculo: (Col2 / Taxa) truncado a 2 decimais, depois * Col1
      let val3 = 0;
      if (taxaVal !== 0) {
        const converted = Math.trunc((val2 / taxaVal) * 100) / 100;
        val3 = converted * val1;
      }
      totalVMCV += val3;

      res1.push(raw1);
      res2.push(raw2);
      res3.push(isFinite(val3) ? fmtWithThousands.format(val3) : '0,00');
    });

    txtOutput1.value = res1.join('\n');
    txtOutput2.value = res2.join('\n');
    txtOutput3.value = res3.join('\n');
    vmcvOutput.textContent = 'VMCV: ' + (isFinite(totalVMCV) ? fmtWithThousands.format(totalVMCV) : '0,00');
  });
}

// Formatação PT-BR
const fmtWithThousands = new Intl.NumberFormat('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const fmtNoThousands = new Intl.NumberFormat('pt-BR', {useGrouping:false, minimumFractionDigits:2, maximumFractionDigits:2});

function attachDueEvents(){
  const valorNota = document.getElementById('valorNota');
  const taxaMoeda = document.getElementById('taxaMoeda');
  const valorConvertido = document.getElementById('valorConvertido');

  const pesoLiquido = document.getElementById('pesoLiquido');
  const valorUnitario = document.getElementById('valorUnitario');
  const totalComMilhares = document.getElementById('totalComMilhares');
  const totalSemMilhares = document.getElementById('totalSemMilhares');

  const frete = document.getElementById('frete');
  const freteConvertido = document.getElementById('freteConvertido');
  const freteComMilhares = document.getElementById('freteComMilhares');
  const seguro = document.getElementById('seguro');
  const seguroConvertido = document.getElementById('seguroConvertido');
  const seguroComMilhares = document.getElementById('seguroComMilhares');
  const finalComMilhares = document.getElementById('finalComMilhares');
  const finalSemMilhares = document.getElementById('finalSemMilhares');
  const swConverter = document.getElementById('swConverter');

  function parseMoney(val){
    if(!val) return 0;
    // Remove pontos (milhar) e troca vírgula por ponto (decimal)
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
  }

  function calcConvertido(){
    const v = parseMoney(valorNota.value);
    const t = parseMoney(taxaMoeda.value);
    const result = v / t;
    valorConvertido.textContent = 'Valor convertido: ' + (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcTotais(){
    const p = parseMoney(pesoLiquido.value);
    const u = parseMoney(valorUnitario.value);
    const prod = p * u;
    totalComMilhares.textContent = (isFinite(prod) ? fmtWithThousands.format(prod) : '0,00');
    totalSemMilhares.textContent = (isFinite(prod) ? fmtNoThousands.format(prod) : '0,00');
  }

  function calcFrete(){
    const f = parseMoney(frete.value);
    const t = parseMoney(taxaMoeda.value);
    let result = f;
    if(swConverter && swConverter.checked){
      result = t !== 0 ? f / t : 0;
    }
    freteConvertido.textContent = (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
    if(freteComMilhares) freteComMilhares.textContent = (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcSeguro(){
    const s = parseMoney(seguro.value);
    const t = parseMoney(taxaMoeda.value);
    let result = s;
    if(swConverter && swConverter.checked){
      result = t !== 0 ? s / t : 0;
    }
    seguroConvertido.textContent = (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
    if(seguroComMilhares) seguroComMilhares.textContent = (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcFinal(){
    const v = parseMoney(valorNota.value);
    const t = parseMoney(taxaMoeda.value);
    const f = parseMoney(frete.value);
    const s = parseMoney(seguro.value);
    const valorConv = v / t;
    let freteConv = f;
    let seguroConv = s;
    if(swConverter && swConverter.checked){
      freteConv = t !== 0 ? f / t : 0;
      seguroConv = t !== 0 ? s / t : 0;
    }
    const final = valorConv - freteConv - seguroConv;
    finalComMilhares.textContent = isFinite(final) ? fmtWithThousands.format(final) : '0,00';
    finalSemMilhares.textContent = isFinite(final) ? fmtNoThousands.format(final) : '0,00';
  }
  
  // Eventos
  [valorNota, taxaMoeda, pesoLiquido, valorUnitario, frete, seguro].forEach(el => {
    el.addEventListener('input', function() {
      // Apenas remove caracteres inválidos, permitindo ponto e vírgula (para colar funcionar)
      this.value = this.value.replace(/[^0-9.,]/g, '');
    });
    el.addEventListener('keydown', (e) => {
      // Se já existe vírgula, impede digitar outra vírgula ou ponto
      if ((e.key === ',' || e.key === '.') && el.value.includes(',')) {
        e.preventDefault();
        return;
      }
      if(e.key === '.'){
        e.preventDefault();
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = el.value.substring(0, start) + ',' + el.value.substring(end);
        el.selectionStart = el.selectionEnd = start + 1;
        el.dispatchEvent(new Event('input'));
      }
    });
  });

  [valorNota, taxaMoeda].forEach(el => el.addEventListener('input', calcConvertido));
  [pesoLiquido, valorUnitario].forEach(el => el.addEventListener('input', calcTotais));
  [frete, taxaMoeda].forEach(el => el.addEventListener('input', calcFrete));
  [seguro, taxaMoeda].forEach(el => el.addEventListener('input', calcSeguro));
  [valorNota, taxaMoeda, frete, seguro].forEach(el => el.addEventListener('input', calcFinal));
  if(swConverter) swConverter.addEventListener('change', () => {
    calcFrete();
    calcSeguro();
    calcFinal();
  });

  // executar cálculos iniciais
  calcConvertido();
  calcTotais();
  calcFrete();
  calcSeguro();
  calcFinal();
}

// Inicializa com a página Due selecionada
loadPage('due');

// --- Funções Auxiliares para Planilha ---

function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file);
  });
}

function parseNFeXML(xmlText, fileName){
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  const getValue = (parent, tag) => {
    if(!parent) return '';
    const els = parent.getElementsByTagName(tag);
    return els.length > 0 ? els[0].textContent : '';
  };

  const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
  if(!infNFe) return []; 

  const ide = infNFe.getElementsByTagName('ide')[0];
  const emit = infNFe.getElementsByTagName('emit')[0];
  const dest = infNFe.getElementsByTagName('dest')[0];
  const transp = infNFe.getElementsByTagName('transp')[0];
  const infAdic = infNFe.getElementsByTagName('infAdic')[0];
  const dets = infNFe.getElementsByTagName('det');

  const nNF = ide ? getValue(ide, 'nNF') : '';
  let emitNome = emit ? getValue(emit, 'xNome') : '';
  const emitMun = emit ? getValue(emit, 'xMun') : '';
  if(emitMun) emitNome += ' - ' + emitMun;
  const emitCNPJ = emit ? getValue(emit, 'CNPJ') : '';
  const destNome = dest ? getValue(dest, 'xNome') : '';

  // Extração de dados logísticos e pesos para cálculo
  let qVolStr = '';
  let qVolNum = 0;
  let pesoLNum = 0;
  let pesoBNum = 0;

  if(transp){
    const vol = transp.getElementsByTagName('vol')[0];
    if(vol){
      qVolStr = getValue(vol, 'qVol');
      qVolNum = parseFloat(qVolStr) || 0;
      pesoLNum = parseFloat(getValue(vol, 'pesoL')) || 0;
      pesoBNum = parseFloat(getValue(vol, 'pesoB')) || 0;
    }
  }

  const xDiferenca = Math.max(0, pesoBNum - pesoLNum);
  const pesoExtraPorCaixa = qVolNum > 0 ? (xDiferenca / qVolNum) : 0;

  const infCpl = infAdic ? getValue(infAdic, 'infCpl') : '';
  
  // Regex para Pallets: // 21 PALLETS //
  let pallets = '';
  let matchPallets = infCpl.match(/\/\/\s*(\d+)\s*PALLETS\s*\/\//i);
  if(!matchPallets){
    // Fallback: // FORAM CARREGADOS 20 PALLETS //
    matchPallets = infCpl.match(/\/\/\s*FORAM\s+CARREGADOS\s+(\d+)\s+PALLETS\s*\/\//i);
  }
  if(!matchPallets){
    // Fallback 2: // 21 PALLETS PD: 16013154 //
    matchPallets = infCpl.match(/\/\/\s*(\d+)\s*PALLETS.*?\/\//i);
  }
  if(matchPallets) pallets = matchPallets[1];

  // Regex para Container: // CONTAINER: SUDU 603390 5 //
  let container = '';
  const matchContainer = infCpl.match(/\/\/\s*CONTAINER:\s*(.*?)\s*\/\//i);
  if(matchContainer){
    container = matchContainer[1].replace(/\s+/g, '');
  }

  // Concatenação: NF "numero" - "caixas" CXS - "pallets" PLTS - "container"
  const logistica = `NF ${nNF} - ${qVolStr || '?'} CXS - ${pallets || '?'} PLTS - ${container || '?'}`;

  const items = [];
  for(let i=0; i<dets.length; i++){
    const prod = dets[i].getElementsByTagName('prod')[0];
    if(prod){
      const infAdProd = getValue(dets[i], 'infAdProd');
      const descricao = getValue(prod, 'xProd');

      let caixas = 0;
      if(infAdProd){
        const match = infAdProd.match(/Qtde\s+apresenta[cç][aã]o\s*=\s*(\d+)\s*\/\//i);
        if(match) caixas = parseInt(match[1], 10);
      }

      // Cálculo Peso Bruto do Item (Peso Líquido + Proporcional da Embalagem)
      const itemPesoLiquido = parseFloat(getValue(prod, 'qCom')) || 0;
      const itemPesoBruto = itemPesoLiquido + (pesoExtraPorCaixa * caixas);

      items.push({
        Arquivo: fileName,
        Numero: nNF,
        Emitente: emitNome,
        CNPJ: emitCNPJ,
        Destinatario: destNome,
        Codigo: getValue(prod, 'cProd'),
        Descricao: descricao,
        NCM: getValue(prod, 'NCM'),
        CFOP: getValue(prod, 'CFOP'),
        Unid: getValue(prod, 'uCom'),
        Qtd: getValue(prod, 'qCom').replace('.', ','),
        Caixas: caixas,
        PesoBruto: itemPesoBruto,
        Logistica: logistica
      });
    }
  }
  return items;
}

function readExcelFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, {defval:''});
      
      let lastNumero = '';
      let lastEmitente = '';
      let lastCNPJ = '';
      let lastDestinatario = '';
      let lastLogistica = '';

      const mappedData = jsonData.map(row => {
        let num = row['NÚMERO'];
        let emit = row['EMITENTE'];
        let cnpj = row['CNPJ'];
        let dest = row['DESTINATÁRIO'];
        let log = row['LOGISTICA'];

        if(num !== undefined && num !== '' && num !== null){
          lastNumero = num;
          lastEmitente = emit;
          lastCNPJ = cnpj;
          lastDestinatario = dest;
          lastLogistica = log;
        } else if(row['PRODUTO'] || row['NCM']){
          num = lastNumero;
          emit = lastEmitente;
          cnpj = lastCNPJ;
          dest = lastDestinatario;
          log = lastLogistica;
        }

        return {
          Arquivo: 'Existente',
          Numero: num || '',
          Emitente: emit || '',
          CNPJ: cnpj || '',
          Destinatario: dest || '',
          NCM: row['NCM'] || '',
          Codigo: '', 
          Descricao: row['PRODUTO'] || '',
          Unid: row['UNID'] || '',
          Qtd: row['QTD'] || '',
          Logistica: log || ''
        };
      });
      resolve(mappedData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function renderPreviewTables(data){
  const containerDetail = document.getElementById('previewArea');
  const containerSummary = document.getElementById('previewAreaSummary');

  if(!data || data.length === 0){
    const msg = '<div style="text-align:center; color:#888; margin-top:20px;">Nenhum dado encontrado.</div>';
    if(containerDetail) containerDetail.innerHTML = msg;
    if(containerSummary) containerSummary.innerHTML = msg;
    return;
  }
  
  // Preparar dados para visualização simplificada (Agrupado por Nota)
  const invoices = new Map();
  data.forEach(item => {
    const key = `${item.Arquivo}_${item.Numero}`;
    if(!invoices.has(key)){
      let cnpjFmt = item.CNPJ || '';
      if(cnpjFmt.length === 14){
        cnpjFmt = cnpjFmt.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      }
      invoices.set(key, {
        Arquivo: item.Arquivo,
        Emitente: `${item.Emitente} - ${cnpjFmt}`,
        DadosDaNota: item.Logistica
      });
    }
  });
  const displayData = Array.from(invoices.values());

  // Ordenar displayData por número NF crescente
  const extractNFNumber = (text) => {
    const match = text && text.match(/NF\s*([0-9]+)\s*-/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };
  displayData.sort((a, b) => {
    const numA = extractNFNumber(a.DadosDaNota);
    const numB = extractNFNumber(b.DadosDaNota);
    if (numA !== numB) return numA - numB;
    return String(a.DadosDaNota).localeCompare(String(b.DadosDaNota));
  });

  // Tabela Detalhada
  let htmlDetail = '<h3 style="margin-top:0; font-size:1.1em;">Dados Detalhados</h3>';
  htmlDetail += '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
  htmlDetail += '<thead><tr style="background:rgba(255,255,255,0.1);">';
  htmlDetail += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Arquivo</th>';
  htmlDetail += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Emitente</th>';
  htmlDetail += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Dados da Nota</th>';
  htmlDetail += '</tr></thead><tbody>';
  
  displayData.forEach(row => {
    htmlDetail += '<tr>';
    htmlDetail += `<td style="padding:6px; border-bottom:1px solid #444;">${row.Arquivo}</td>`;
    htmlDetail += `<td style="padding:6px; border-bottom:1px solid #444;">${row.Emitente}</td>`;
    htmlDetail += `<td style="padding:6px; border-bottom:1px solid #444;">${row.DadosDaNota}</td>`;
    htmlDetail += '</tr>';
  });
  htmlDetail += '</tbody></table>';
  if(containerDetail) containerDetail.innerHTML = htmlDetail;

  // Tabela Agregada (Resumo)
  const aggregated = calculateAggregation(data);
  let htmlSummary = '<h3 style="margin-top:0; font-size:1.1em;">Resumo por CNPJ e Produto</h3>';
  htmlSummary += '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
  htmlSummary += '<thead><tr style="background:rgba(255,255,255,0.1);">';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">CNPJ</th>';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Código</th>';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Descrição</th>';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Total Caixas</th>';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Total Peso Líquido</th>';
  htmlSummary += '<th style="padding:8px; text-align:left; border-bottom:1px solid #555; position:sticky; top:0; background:#333;">Total Peso Bruto</th>';
  htmlSummary += '</tr></thead><tbody>';

  aggregated.forEach(row => {
    htmlSummary += '<tr>';
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.CNPJ}</td>`;
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.Codigo}</td>`;
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.Descricao}</td>`;
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.TotalCaixas}</td>`;
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.TotalPeso.toLocaleString('pt-BR', {minimumFractionDigits:3})}</td>`;
    htmlSummary += `<td style="padding:6px; border-bottom:1px solid #444;">${row.TotalPesoBruto.toLocaleString('pt-BR', {minimumFractionDigits:3})}</td>`;
    htmlSummary += '</tr>';
  });
  htmlSummary += '</tbody></table>';
  if(containerSummary) containerSummary.innerHTML = htmlSummary;
}

function calculateAggregation(data){
  const groups = {};

  data.forEach(item => {
    const cnpj = item.CNPJ || '';
    const codigo = item.Codigo || '';
    const key = `${cnpj}_${codigo}`;

    if(!groups[key]){
      groups[key] = { CNPJ: cnpj, Codigo: codigo, Descricao: item.Descricao, TotalCaixas: 0, TotalPeso: 0, TotalPesoBruto: 0 };
    }

    let qtdStr = item.Qtd ? String(item.Qtd) : '0';
    qtdStr = qtdStr.replace(/\./g, '').replace(',', '.');
    groups[key].TotalPeso += (parseFloat(qtdStr) || 0);

    if(item.Caixas) groups[key].TotalCaixas += item.Caixas;
    if(item.PesoBruto) groups[key].TotalPesoBruto += item.PesoBruto;
  });

  return Object.values(groups).sort((a,b) => {
    if(a.CNPJ !== b.CNPJ) return a.CNPJ.localeCompare(b.CNPJ);
    return a.Codigo.localeCompare(b.Codigo);
  });
}

async function generateMinervaExcel(data){
  // 1. Validar Dados
  const cnpjs = [...new Set(data.map(item => item.CNPJ))].filter(Boolean);
  if(cnpjs.length === 0) {
    alert("Nenhum CNPJ encontrado para gerar o relatório.");
    return;
  }

  // 2. Carregar arquivo base com ExcelJS (preserva estilos)
  let buffer;
  try {
    const response = await fetch('assets/Planilha_base.xlsx');
    if(!response.ok) throw new Error("Arquivo base não encontrado");
    buffer = await response.arrayBuffer();
  } catch(e) {
    console.error(e);
    alert("Erro ao carregar o arquivo base (assets/Planilha_base.xlsx). Verifique se o arquivo existe na pasta assets.");
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const srcWs = wb.getWorksheet(1); // Primeira aba

  // Criar novo Workbook para saída
  const newWb = new ExcelJS.Workbook();
  const destWs = newWb.addWorksheet("Aba nova LPL");

  // --- Funções Auxiliares ---
  
  // Copiar larguras das colunas (A até J por segurança)
  for(let i=1; i<=10; i++){
    const srcCol = srcWs.getColumn(i);
    if(srcCol && srcCol.width) {
        destWs.getColumn(i).width = srcCol.width;
    }
  }

  // Helper para converter índice de coluna em letra (1->A, 2->B)
  const getColLetter = (colIdx) => {
      let dividend = colIdx;
      let columnName = "";
      let modulo;
      while (dividend > 0) {
          modulo = (dividend - 1) % 26;
          columnName = String.fromCharCode(65 + modulo) + columnName;
          dividend = Math.floor((dividend - 1) / 26);
      }
      return columnName;
  };

  // Helper para parsear range de merge (ex: "A1:B2")
  const parseRange = (rangeStr) => {
    if(!rangeStr) return null;
    const parts = rangeStr.split(':');
    if(parts.length !== 2) return null;
    const parseCell = (c) => {
      const match = c.match(/([A-Z]+)([0-9]+)/);
      if(!match) return null;
      return { col: match[1], row: parseInt(match[2]) };
    };
    const s = parseCell(parts[0]);
    const e = parseCell(parts[1]);
    if(!s || !e) return null;
    return { s, e };
  };

  // Helper para copiar uma linha inteira (estilo e conteúdo)
  const copyRow = (srcR, destR) => {
    const sRow = srcWs.getRow(srcR);
    const dRow = destWs.getRow(destR);
    dRow.height = sRow.height;
    
    sRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const dCell = dRow.getCell(colNumber);
      dCell.value = cell.value;
      dCell.style = JSON.parse(JSON.stringify(cell.style)); // Copia profunda do estilo
    });
    
    // Copiar Merges que começam nesta linha
    (srcWs.model.merges || []).forEach(rangeStr => {
        const range = parseRange(rangeStr);
        if(range && range.s.row === srcR){
            const rowSpan = range.e.row - range.s.row;
            const startCol = range.s.col;
            const endCol = range.e.col;
            const destStartRow = destR;
            const destEndRow = destR + rowSpan;
            // Aplicar merge no destino
            destWs.mergeCells(`${startCol}${destStartRow}:${endCol}${destEndRow}`);
        }
    });
  };

  // 3. Copiar Cabeçalho Fixo (Linhas 1 a 10)
  let currentDestRow = 1;
  for (let r = 1; r <= 10; r++) {
    copyRow(r, currentDestRow);
    currentDestRow++;
  }

  // 4. Processar Grupos
  // Linhas do Template (Baseado no Excel, índice 1): 11 a 19
  const tStart = 11;
  const tEnd = 19;
  const tProdRow = 14;
  const tLogRow = 16;
  const tTotalRow = 19;

  const groups = {};
  data.forEach(item => {
    const cnpj = item.CNPJ || 'SEM_CNPJ';
    if (!groups[cnpj]) groups[cnpj] = { CNPJ: item.CNPJ, items: [] };
    groups[cnpj].items.push(item);
  });
  const sortedGroups = Object.values(groups).sort((a, b) => (a.CNPJ || '').localeCompare(b.CNPJ || ''));

  for (const group of sortedGroups) {
    const groupStartRow = currentDestRow;
    
    const products = calculateAggregation(group.items);
    const logisticsRaw = [...new Set(group.items.map(i => i.Logistica))];
    const extractNFNumber = (text) => {
      const match = text && text.match(/NF\s*([0-9]+)\s*-/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    logisticsRaw.sort((a, b) => {
      const numA = extractNFNumber(a);
      const numB = extractNFNumber(b);
      if (numA !== numB) return numA - numB;
      return String(a).localeCompare(String(b));
    });
    const numProdRows = Math.max(1, products.length);
    const numLogRows = Math.max(1, Math.ceil(logisticsRaw.length / 2));

    // Iterar Linhas do Template
    for (let tR = tStart; tR <= tEnd; tR++) {
      
      if (tR === tProdRow) {
        // Repetir para Produtos
        for (let i = 0; i < numProdRows; i++) {
          copyRow(tR, currentDestRow);
          const prod = products[i];
          const row = destWs.getRow(currentDestRow);
          
          if (prod) {
            row.getCell(1).value = prod.Codigo; // A
            row.getCell(2).value = prod.Descricao; // B
            row.getCell(3).value = prod.TotalCaixas; // C
            row.getCell(4).value = prod.TotalPeso; // D
            row.getCell(5).value = prod.TotalPesoBruto; // E
          } else {
             // Limpar valores se for linha extra vazia
             [1,2,3,4,5].forEach(c => row.getCell(c).value = null);
          }
          currentDestRow++;
        }
      } else if (tR === tLogRow) {
        // Repetir para Logística
        for (let i = 0; i < numLogRows; i++) {
          copyRow(tR, currentDestRow);
          const idx1 = i * 2;
          const idx2 = i * 2 + 1;
          const row = destWs.getRow(currentDestRow);
          
          row.getCell(1).value = logisticsRaw[idx1] || "";
          row.getCell(2).value = logisticsRaw[idx2] || "";
          // Limpar outras células se necessário
          if(row.getCell(3).value) row.getCell(3).value = null;
          currentDestRow++;
        }
      } else {
        // Cópia Padrão de Linha Única
        copyRow(tR, currentDestRow);
        const row = destWs.getRow(currentDestRow);

        // Substituições Específicas
        if (tR === 11) { // Emitente
           let cnpjFmt = group.CNPJ || '';
           if(cnpjFmt.length === 14) cnpjFmt = cnpjFmt.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
           row.getCell(1).value = `${group.items[0].Emitente} - ${cnpjFmt}`;
        }
        
        if (tR === tTotalRow) { // Totais (Fórmulas)
           // Calcular intervalo dos produtos para este grupo
           // Header (11,12,13) são 3 linhas. Produtos começam em groupStartRow + 3
           const prodStart = groupStartRow + 3;
           const prodEnd = prodStart + numProdRows - 1;
           
           ['C', 'D', 'E'].forEach(col => {
               // ExcelJS usa índice 1-based: C=3, D=4, E=5
               const colIdx = col === 'C' ? 3 : col === 'D' ? 4 : 5;
               row.getCell(colIdx).value = { formula: `SUM(${col}${prodStart}:${col}${prodEnd})` };
           });
        }

        currentDestRow++;
      }
    }
  }

  // 5. Exportar
  const bufferOut = await newWb.xlsx.writeBuffer();
  const blob = new Blob([bufferOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "LPL_Planilha.xlsx";
  anchor.click();
  window.URL.revokeObjectURL(url);
}

// ==========================================
// FUNÇÕES PARA LPL PLANILHA E PORTOS API
// ==========================================

function renderLplPlanilha(){
  const loggedInUser = sessionStorage.getItem('lpl_user') || 'Usuário';
  renderLplPlanilhaDashboard(loggedInUser);
}

function renderLplPlanilhaLogin(errorMessage = '', redirectPage = 'lpl-planilha'){
  contentArea.innerHTML = `
    <div class="card" style="max-width: 400px; margin: 40px auto; padding: 30px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); border: 1px solid var(--border); background: var(--card-bg); border-radius: 12px;">
      <h2 style="text-align: center; margin-bottom: 24px; color: var(--text);">LPL Planilha — Acesso</h2>
      
      ${errorMessage ? `<div style="background-color: rgba(220, 53, 69, 0.1); color: #ff4a5a; padding: 10px; border-radius: 6px; border: 1px solid rgba(220, 53, 69, 0.2); margin-bottom: 16px; font-size: 14px; text-align: center;">${errorMessage}</div>` : ''}
      
      <form id="lplLoginForm" style="display: flex; flex-direction: column; gap: 16px;">
        <div class="field" style="width: 100%;">
          <label style="margin-bottom: 6px; font-weight: 500;">Usuário</label>
          <input type="text" id="lplUsernameInput" required style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;" placeholder="Nome de usuário">
        </div>
        
        <div class="field" style="width: 100%;">
          <label style="margin-bottom: 6px; font-weight: 500;">Senha</label>
          <input type="password" id="lplPasswordInput" required style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;" placeholder="Senha">
        </div>
        
        <button type="submit" class="nav-btn active" style="margin-top: 10px; width: 100%; text-align: center; font-weight: bold; padding: 12px; border-radius: 6px;">Entrar</button>
      </form>
    </div>
  `;
  
  const form = document.getElementById('lplLoginForm');
  if(form){
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('lplUsernameInput').value.trim();
      const senha = document.getElementById('lplPasswordInput').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, senha })
        });
        
        const result = await response.json();
        if(response.ok && result.success){
          sessionStorage.setItem('lpl_planilha_user', result.user);
          const targetBtn = document.querySelector(`[data-page="${redirectPage}"]`);
          if(targetBtn){
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            targetBtn.classList.add('active');
          }
          loadPage(redirectPage);
        } else {
          renderLplPlanilhaLogin(result.message || 'Login ou senha inválidos.', redirectPage);
        }
      } catch(err){
        console.error(err);
        renderLplPlanilhaLogin('Erro ao conectar ao servidor.', redirectPage);
      }
    });
  }
}

function renderLplPlanilhaDashboard(username){
  contentArea.innerHTML = `
    <div class="card" style="position: relative; padding: 24px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-bg);">
      <!-- Header do painel -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <h2 style="margin: 0; color: var(--text);">LPL Planilha & Rastreamento</h2>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="lplOpenTcpBtn" class="nav-btn" style="margin: 0; width: auto; font-size: 13px; padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.02); color: var(--text);" onclick="window.open('https://portal.tcp.com.br', '_blank')">
            🌐 Abrir Portal TCP
          </button>
          <button id="lplBookmarkletBtn" class="nav-btn active" style="margin: 0; width: auto; font-size: 13px; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px;">
            🔗 Sincronizador 1 Clique
          </button>
        </div>
      </div>

      <!-- Pesquisa de Contêiner -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: var(--text);">Consulta de Contêineres</h3>
        <p style="color: var(--muted); font-size: 14px; margin-bottom: 16px;">Consulte o status do contêiner nos terminais portuários parceiros (TCP, POA, NAV, TEC).</p>
        
        <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
          <div class="field" style="flex: 1; min-width: 200px; margin-bottom: 0;">
            <label style="margin-bottom: 6px;">Código do Contêiner</label>
            <input type="text" id="lplContainerInput" placeholder="Ex: ABCD1234567" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
          </div>
          <div class="field" style="flex: 1; min-width: 200px; margin-bottom: 0;">
            <label style="margin-bottom: 6px;">Booking / Reserva (Itapoá)</label>
            <input type="text" id="lplBookingInput" placeholder="Ex: 721539548" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
          </div>
          <button id="lplSearchBtn" class="nav-btn active" style="margin: 0; padding: 11px 24px; font-weight: bold; width: auto; border-radius: 6px;">Pesquisar</button>
        </div>
      </div>

      <!-- Grid de Status das APIs -->
      <div id="lplApisStatusGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px;">
        <div class="api-status-card" id="api-card-tcp" style="padding: 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: bold; font-size: 14px;">TCP (Paranaguá)</span>
          <span class="status-badge" style="font-size: 12px; color: var(--muted);">Aguardando consulta...</span>
        </div>
        <div class="api-status-card" id="api-card-poa" style="padding: 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: bold; font-size: 14px;">POA (Itapoá)</span>
          <span class="status-badge" style="font-size: 12px; color: var(--muted);">Aguardando consulta...</span>
        </div>
        <div class="api-status-card" id="api-card-nav" style="padding: 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: bold; font-size: 14px;">NAV (Portonave)</span>
          <span class="status-badge" style="font-size: 12px; color: var(--muted);">Aguardando consulta...</span>
        </div>
        <div class="api-status-card" id="api-card-tec" style="padding: 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: bold; font-size: 14px;">TEC (Teconline)</span>
          <span class="status-badge" style="font-size: 12px; color: var(--muted);">Aguardando consulta...</span>
        </div>
      </div>

      <!-- Resultados -->
      <div id="lplResultsArea" style="min-height: 100px; padding: 16px; border: 1px dashed var(--border); border-radius: 8px; background: rgba(255,255,255,0.01);">
        <div style="text-align: center; color: var(--muted); padding: 20px 0;">Insira o código do contêiner para iniciar a busca.</div>
      </div>
    </div>
  `;



  // Resultados ativos na sessão
  let activeLplResults = [];

  // Anexar evento de busca geral (todos os portos)
  const searchBtn = document.getElementById('lplSearchBtn');
  const containerInput = document.getElementById('lplContainerInput');
  if(searchBtn && containerInput){
    const doSearch = async () => {
      const containerInputVal = containerInput.value.trim();
      const bookingInput = document.getElementById('lplBookingInput');
      const bookingInputVal = bookingInput ? bookingInput.value.trim() : '';

      if (!containerInputVal && !bookingInputVal) {
        alert('Por favor, digite o código do contêiner ou o Booking/Reserva.');
        return;
      }
      
      let containerCodes = [];
      if (containerInputVal) {
        containerCodes = containerInputVal.split(',')
          .map(c => c.trim().toUpperCase())
          .filter(Boolean);
      } else {
        containerCodes = [bookingInputVal.toUpperCase()];
      }
        
      if(containerCodes.length === 0){
        alert('Por favor, digite ao menos um código de contêiner ou Booking válido.');
        return;
      }
      
      // Atualizar interface para estado de busca inicial
      updateApiStatus('tcp', 'searching', 'Buscando...');
      updateApiStatus('poa', 'searching', 'Buscando...');
      updateApiStatus('nav', 'searching', 'Buscando...');
      updateApiStatus('tec', 'searching', 'Buscando...');
      
      const resultsArea = document.getElementById('lplResultsArea');
      
      // Gerar HTML da lista de progresso com design premium e responsivo
      let progressItemsHtml = '';
      containerCodes.forEach(code => {
        progressItemsHtml += `
          <div id="progress-item-${code}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border); border-left: 4px solid #6c757d; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 8px; text-align: left;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="progress-icon" style="font-size: 16px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--muted);">⏳</span>
              <span style="font-weight: 600; color: var(--text); font-size: 14px; letter-spacing: 0.5px;">${code}</span>
            </div>
            <span class="progress-status" style="color: var(--muted); font-size: 13px; font-weight: 600; letter-spacing: 0.2px;">Aguardando...</span>
          </div>
        `;
      });
      
      resultsArea.innerHTML = `
        <div style="text-align: center; padding: 20px 0; color: var(--text);">
          <div class="spinner-inline" style="margin-bottom: 16px;"></div>
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 20px;">Buscando nos terminais portuários...</div>
          <div style="display: flex; flex-direction: column; gap: 4px; max-width: 450px; margin: 0 auto; width: 100%;">
            ${progressItemsHtml}
          </div>
        </div>
      `;
      
      activeLplResults = [];
      const aggregatedStatuses = {
        tcp: { status: 'success', message: 'Não consultado' },
        poa: { status: 'success', message: 'Não consultado' },
        nav: { status: 'success', message: 'Não consultado' },
        tec: { status: 'success', message: 'Não consultado' }
      };
      
      try {
        for (const code of containerCodes) {
          const item = document.getElementById(`progress-item-${code}`);
          if(item){
            const statusEl = item.querySelector('.progress-status');
            const iconEl = item.querySelector('.progress-icon');
            if(statusEl) {
              statusEl.innerHTML = 'Buscando...';
              statusEl.style.color = '#0a84ff';
            }
            if(iconEl) {
              iconEl.innerHTML = '<span class="spinner-inline" style="width: 14px; height: 14px; border-width: 2px;"></span>';
              iconEl.style.color = '#0a84ff';
            }
            item.style.borderColor = 'rgba(10, 132, 255, 0.2)';
            item.style.borderLeftColor = '#0a84ff';
            item.style.background = 'rgba(10, 132, 255, 0.04)';
          }
          
          let searchUrl = `/api/search?container=${code}`;
          if (bookingInputVal) {
            searchUrl += `&booking=${encodeURIComponent(bookingInputVal)}`;
          } else if (!containerInputVal) {
            searchUrl += `&booking=${encodeURIComponent(code)}`;
          }
          
          const response = await fetch(searchUrl);
          const result = await response.json();
          
          let found = false;
          if(result.results && result.results.length > 0){
            found = true;
            activeLplResults.push(...result.results);
          }
          
          // Atualizar item de progresso
          if(item){
            const statusEl = item.querySelector('.progress-status');
            const iconEl = item.querySelector('.progress-icon');
            if(found){
              const match = result.results.find(r => r.booking && r.booking !== 'N/A');
              const bkg = match ? ` (Bkg: ${match.booking})` : '';
              const portsFound = result.results.map(r => r.api).join(', ');
              if(statusEl) {
                statusEl.innerHTML = `Achado em ${portsFound}${bkg}`;
                statusEl.style.color = '#28a745';
              }
              if(iconEl) {
                iconEl.innerHTML = '✔';
                iconEl.style.color = '#28a745';
              }
              item.style.borderColor = 'rgba(40, 167, 69, 0.2)';
              item.style.borderLeftColor = '#28a745';
              item.style.background = 'rgba(40, 167, 69, 0.04)';
            } else {
              if(statusEl) {
                statusEl.innerHTML = 'Não encontrado';
                statusEl.style.color = '#dc3545';
              }
              if(iconEl) {
                iconEl.innerHTML = '✖';
                iconEl.style.color = '#dc3545';
              }
              item.style.borderColor = 'rgba(220, 53, 69, 0.2)';
              item.style.borderLeftColor = '#dc3545';
              item.style.background = 'rgba(220, 53, 69, 0.04)';
            }
          }
          
          // Agregar status
          if(result.statuses){
            Object.keys(result.statuses).forEach(port => {
              const val = result.statuses[port];
              const current = aggregatedStatuses[port];
              
              const getWeight = (s) => {
                if (s.status === 'erro login') return 4;
                if (s.status === 'erro api') return 3;
                if (s.status === 'success' && s.message === 'Sucesso') return 2;
                if (s.status === 'success' && s.message === 'Não encontrado') return 1;
                return 0;
              };
              
              if(getWeight(val) > getWeight(current)){
                aggregatedStatuses[port] = val;
              }
            });
            
            // Atualizar status na grade superior em tempo real
            Object.keys(aggregatedStatuses).forEach(port => {
              const val = aggregatedStatuses[port];
              if(val.message !== 'Não consultado'){
                updateApiStatus(port, val.status, val.message);
              }
            });
          }
          
          // Esperar um breve momento antes do próximo
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        // Renderizar a lista final de resultados
        renderResultsList(activeLplResults, containerInputVal.toUpperCase());
      } catch(err){
        console.error(err);
        resultsArea.innerHTML = `<div style="text-align: center; padding: 20px 0; color: #ff4a5a;">Erro na comunicação com o servidor.</div>`;
        updateApiStatus('tcp', 'error_api', 'Erro de API');
        updateApiStatus('poa', 'error_api', 'Erro de API');
        updateApiStatus('nav', 'error_api', 'Erro de API');
        updateApiStatus('tec', 'error_api', 'Erro de API');
      }
    };
    
    searchBtn.addEventListener('click', doSearch);
    containerInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') doSearch();
    });
    const bookingInput = document.getElementById('lplBookingInput');
    if (bookingInput) {
      bookingInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') doSearch();
      });
    }

    // Vincular clique de busca individual para cada cartão de terminal
    const bindSinglePortSearch = (port) => {
      const card = document.getElementById(`api-card-${port}`);
      if(card){
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s ease';
        
        card.addEventListener('mouseenter', () => {
          card.style.background = 'rgba(255,255,255,0.06)';
          card.style.transform = 'translateY(-2px)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.background = 'rgba(255,255,255,0.02)';
          card.style.transform = 'none';
          card.style.boxShadow = 'none';
        });
        
        card.addEventListener('click', async () => {
          const containerInputVal = containerInput.value.trim();
          const bookingInput = document.getElementById('lplBookingInput');
          const bookingInputVal = bookingInput ? bookingInput.value.trim() : '';

          if(!containerInputVal && !bookingInputVal){
            alert('Por favor, digite o código do contêiner ou o Booking primeiro.');
            return;
          }
          
          let containerCodes = [];
          if (containerInputVal) {
            containerCodes = containerInputVal.split(',')
              .map(c => c.trim().toUpperCase())
              .filter(Boolean);
          } else {
            containerCodes = [bookingInputVal.toUpperCase()];
          }
            
          if(containerCodes.length === 0){
            alert('Por favor, digite ao menos um código de contêiner ou Booking válido.');
            return;
          }
          
          const resultsArea = document.getElementById('lplResultsArea');
          
          // Gerar HTML da lista de progresso com design premium e responsivo
          let progressItemsHtml = '';
          containerCodes.forEach(code => {
            progressItemsHtml += `
              <div id="progress-item-${code}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border); border-left: 4px solid #6c757d; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 8px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="progress-icon" style="font-size: 16px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--muted);">⏳</span>
                  <span style="font-weight: 600; color: var(--text); font-size: 14px; letter-spacing: 0.5px;">${code}</span>
                </div>
                <span class="progress-status" style="color: var(--muted); font-size: 13px; font-weight: 600; letter-spacing: 0.2px;">Aguardando...</span>
              </div>
            `;
          });
          
          resultsArea.innerHTML = `
            <div style="text-align: center; padding: 20px 0; color: var(--text);">
              <div class="spinner-inline" style="margin-bottom: 16px;"></div>
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 20px;">Buscando no terminal ${port.toUpperCase()}...</div>
              <div style="display: flex; flex-direction: column; gap: 4px; max-width: 450px; margin: 0 auto; width: 100%;">
                ${progressItemsHtml}
              </div>
            </div>
          `;
          
          updateApiStatus(port, 'searching', 'Buscando...');
          
          try {
            // Filtrar resultados anteriores deste porto de uma vez
            activeLplResults = activeLplResults.filter(r => r.api !== port.toUpperCase());
            
            for (const code of containerCodes) {
              const item = document.getElementById(`progress-item-${code}`);
              if(item){
                const statusEl = item.querySelector('.progress-status');
                const iconEl = item.querySelector('.progress-icon');
                if(statusEl) {
                  statusEl.innerHTML = 'Buscando...';
                  statusEl.style.color = '#0a84ff';
                }
                if(iconEl) {
                  iconEl.innerHTML = '<span class="spinner-inline" style="width: 14px; height: 14px; border-width: 2px;"></span>';
                  iconEl.style.color = '#0a84ff';
                }
                item.style.borderColor = 'rgba(10, 132, 255, 0.2)';
                item.style.borderLeftColor = '#0a84ff';
                item.style.background = 'rgba(10, 132, 255, 0.04)';
              }
              
              let searchUrl = `/api/search?container=${code}&port=${port}`;
              if (bookingInputVal) {
                searchUrl += `&booking=${encodeURIComponent(bookingInputVal)}`;
              } else if (!containerInputVal) {
                searchUrl += `&booking=${encodeURIComponent(code)}`;
              }
              
              const response = await fetch(searchUrl);
              const result = await response.json();
              
              let found = false;
              if(result.results && result.results.length > 0){
                found = true;
                activeLplResults.push(...result.results);
              }
              
              // Atualizar item de progresso
              if(item){
                const statusEl = item.querySelector('.progress-status');
                const iconEl = item.querySelector('.progress-icon');
                if(found){
                  const match = result.results.find(r => r.booking && r.booking !== 'N/A');
                  const bkg = match ? ` (Bkg: ${match.booking})` : '';
                  if(statusEl) {
                    statusEl.innerHTML = `Achado${bkg}`;
                    statusEl.style.color = '#28a745';
                  }
                  if(iconEl) {
                    iconEl.innerHTML = '✔';
                    iconEl.style.color = '#28a745';
                  }
                  item.style.borderColor = 'rgba(40, 167, 69, 0.2)';
                  item.style.borderLeftColor = '#28a745';
                  item.style.background = 'rgba(40, 167, 69, 0.04)';
                } else {
                  if(statusEl) {
                    statusEl.innerHTML = 'Não encontrado';
                    statusEl.style.color = '#dc3545';
                  }
                  if(iconEl) {
                    iconEl.innerHTML = '✖';
                    iconEl.style.color = '#dc3545';
                  }
                  item.style.borderColor = 'rgba(220, 53, 69, 0.2)';
                  item.style.borderLeftColor = '#dc3545';
                  item.style.background = 'rgba(220, 53, 69, 0.04)';
                }
              }
              
              // Atualizar status individual na grade superior
              if(result.statuses && result.statuses[port]){
                const val = result.statuses[port];
                updateApiStatus(port, val.status, val.message);
              }
              
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            renderResultsList(activeLplResults, (containerInputVal || bookingInputVal).toUpperCase());
          } catch(err){
            console.error(err);
            updateApiStatus(port, 'erro api', 'Erro de API');
          }
        });
      }
    };

    bindSinglePortSearch('tcp');
    bindSinglePortSearch('poa');
    bindSinglePortSearch('nav');
    bindSinglePortSearch('tec');



    // Handler para abrir modal do bookmarklet
    const bookmarkletBtn = document.getElementById('lplBookmarkletBtn');
    if (bookmarkletBtn) {
      bookmarkletBtn.addEventListener('click', showBookmarkletModal);
    }

    // Buscar status dos cookies inicialmente e configurar polling a cada 5 segundos
    fetchCookiesStatus();
    const lplIntervalId = setInterval(() => {
      // Se o elemento não existe mais (o usuário mudou de página), limpar o interval
      if (!document.getElementById('lplApisStatusGrid')) {
        clearInterval(lplIntervalId);
        return;
      }
      fetchCookiesStatus();
    }, 5000);
  }
}

async function fetchCookiesStatus() {
  try {
    const response = await fetch('/api/cookies/status');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.statuses) {
        Object.keys(data.statuses).forEach(port => {
          const val = data.statuses[port];
          updateApiStatus(port, val.status, val.message);
        });
      }
    }
  } catch (err) {
    console.error('Error fetching cookies status:', err);
  }
}

function updateApiStatus(port, status, message){
  const card = document.getElementById(`api-card-${port}`);
  if(!card) return;
  const badge = card.querySelector('.status-badge');
  if(!badge) return;
  
  badge.textContent = message;
  card.className = 'api-status-card';
  card.style.borderWidth = '1px';
  card.style.borderStyle = 'solid';
  
  if(status === 'searching'){
    card.style.borderColor = '#0a84ff';
    badge.style.color = '#0a84ff';
    card.style.animation = 'pulse-active 1.5s infinite';
  } else if(status === 'success' || status === 'online'){
    card.style.borderColor = '#28a745';
    badge.style.color = '#28a745';
    card.style.animation = 'none';
  } else if(status === 'erro login'){
    card.style.borderColor = '#fd7e14';
    badge.style.color = '#fd7e14';
    card.style.animation = 'none';
  } else if(status === 'erro api' || status === 'offline'){
    card.style.borderColor = '#dc3545';
    badge.style.color = '#dc3545';
    card.style.animation = 'none';
  } else {
    card.style.borderColor = 'var(--border)';
    badge.style.color = 'var(--muted)';
    card.style.animation = 'none';
  }
}

function renderResultsList(results, containerCode){
  const resultsArea = document.getElementById('lplResultsArea');
  if(!resultsArea) return;
  
  if(results.length === 0){
    resultsArea.innerHTML = `
      <div style="text-align: center; padding: 30px 0; color: var(--muted);">
        Nenhum registro encontrado para o contêiner <strong>${containerCode}</strong> nos terminais integrados.
      </div>
    `;
    return;
  }
  
  let html = `<h4 style="margin-top: 0; margin-bottom: 16px; color: var(--text);">Resultados da busca (${results.length}):</h4>`;
  html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;
  
  results.forEach(res => {
    if (res.notFound) {
      html += `
        <div class="card" style="margin-bottom:0; padding:16px; border:1px solid rgba(220,53,69,0.3); background:rgba(220,53,69,0.01); display:flex; flex-direction:column; gap:12px; border-left: 4px solid #dc3545;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-tcp" style="background:#dc3545; color:white;">${res.api}</span>
              <strong style="font-size: 16px; color: var(--text);">${res.container}</strong>
            </div>
            <span style="font-size: 13px; color: var(--muted);">${res.timeScraped || ''}</span>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">❌</span>
              <div style="font-weight: 500; color: var(--muted); font-size:14px;">${res.status}</div>
            </div>
            <button onclick="window.reSearchContainer('${res.container}', '${res.api.toLowerCase()}')" class="nav-btn" style="margin: 0; padding: 6px 14px; font-size: 12px; font-weight: bold; width: auto; border-radius: 4px; background: rgba(220, 53, 69, 0.1); color: #ff4a5a; border: 1px solid rgba(220, 53, 69, 0.2);">
              Pesquisar novamente
            </button>
          </div>
        </div>
      `;
      return;
    }

    let badgeClass = 'badge-tcp';
    if(res.api === 'POA') badgeClass = 'badge-poa';
    else if(res.api === 'NAV') badgeClass = 'badge-nav';
    else if(res.api === 'TEC') badgeClass = 'badge-tec';
    
    if (res.isDetailed) {
      // 1. Gerar stepper
      const stepsKeys = ['Entrada', 'Aduaneiro', 'Embarque', 'Faturamento'];
      const stepsHtml = stepsKeys.map((key, idx) => {
        const step = res.stepper[key] || { date: '-', state: 'pending' };
        let circleBg = 'rgba(255,255,255,0.1)';
        let circleText = idx + 1;
        let labelColor = 'var(--muted)';
        
        if (step.state === 'completed') {
          circleBg = '#28a745';
          circleText = '✓';
          labelColor = 'var(--text)';
        } else if (step.state === 'active') {
          circleBg = '#007bff';
          circleText = idx + 1;
          labelColor = 'var(--text)';
        }
        
        let lineHtml = '';
        if (idx < 3) {
          const nextKey = stepsKeys[idx + 1];
          const nextStep = res.stepper[nextKey] || { date: '-', state: 'pending' };
          const lineColor = (nextStep.state === 'completed' || nextStep.state === 'active') ? '#28a745' : 'rgba(255,255,255,0.05)';
          lineHtml = `<div style="position:absolute; top:15px; left:calc(50% + 15px); right:calc(-50% + 15px); height:2px; background:${lineColor}; z-index:1;"></div>`;
        }
        
        return `
          <div style="display:flex; flex-direction:column; align-items:center; flex:1; position:relative; min-width:90px; text-align:center;">
            ${lineHtml}
            <div style="width:30px; height:30px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; color:white; font-size:14px; background:${circleBg}; z-index:2; box-shadow:0 0 8px rgba(0,0,0,0.2);">
              ${circleText}
            </div>
            <span style="font-size:12px; font-weight:600; margin-top:8px; color:${labelColor};">${key}</span>
            <span style="font-size:10px; color:var(--muted); margin-top:2px; font-family:monospace;">${step.date || '-'}</span>
          </div>
        `;
      }).join('');

      // 2. Gerar Aba Situação
      const situacaoGrid = Object.keys(res.situacao).map(k => `
        <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:10px; border-radius:6px;">
          <span style="color:var(--muted); font-size:11px; display:block; margin-bottom:2px;">${k}</span>
          <strong style="color:var(--text); font-size:13px;">${res.situacao[k] || '-'}</strong>
        </div>
      `).join('');
      
      // 3. Gerar Aba Detalhes
      const detalhesGrid = Object.keys(res.detalhes.kvs).map(k => `
        <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:10px; border-radius:6px;">
          <span style="color:var(--muted); font-size:11px; display:block; margin-bottom:2px;">${k}</span>
          <strong style="color:var(--text); font-size:13px;">${res.detalhes.kvs[k] || '-'}</strong>
        </div>
      `).join('');
      
      let docTableHtml = '';
      const docs = res.detalhes.documentos || [];
      if (docs.length > 0) {
        const headers = Object.keys(docs[0]);
        docTableHtml = `
          <div style="margin-top:16px;">
            <span style="color:var(--muted); font-size:12px; font-weight:600; display:block; margin-bottom:8px;">Documentação:</span>
            <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.05); border-radius:6px;">
              <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                <thead>
                  <tr style="background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.05);">
                    ${headers.map(h => `<th style="padding:8px 12px; color:var(--muted); font-weight:500;">${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${docs.map(doc => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                      ${headers.map(h => `<td style="padding:8px 12px; color:var(--text);">${doc[h] || '-'}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // 4. Gerar Aba Agendamento
      const agendamentoGrid = Object.keys(res.agendamento.kvs).map(k => `
        <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:10px; border-radius:6px;">
          <span style="color:var(--muted); font-size:11px; display:block; margin-bottom:2px;">${k}</span>
          <strong style="color:var(--text); font-size:13px;">${res.agendamento.kvs[k] || '-'}</strong>
        </div>
      `).join('');
      
      const timelineKeys = ['Agendamento', 'SAV', 'Entrada Gate', 'Operação', 'Saída Gate'];
      const timelineItems = timelineKeys.map(key => {
        const val = res.agendamento.timeline[key] || '-';
        const isDone = val !== '-';
        const circleBg = isDone ? '#28a745' : 'rgba(255,255,255,0.1)';
        const textColor = isDone ? 'var(--text)' : 'var(--muted)';
        
        return `
          <div style="display:flex; flex-direction:column; align-items:center; flex:1; position:relative; min-width:80px; text-align:center;">
            <div style="width:10px; height:10px; border-radius:50%; background:${circleBg}; z-index:2; box-shadow: 0 0 6px ${circleBg};"></div>
            <span style="font-size:11px; font-weight:500; margin-top:6px; color:${textColor};">${key}</span>
            <span style="font-size:9px; color:var(--muted); margin-top:2px; font-family:monospace;">${val}</span>
          </div>
        `;
      }).join('');

      html += `
        <div class="card" style="margin-bottom:0; padding:16px; border:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${badgeClass}">${res.api}</span>
              <strong style="font-size: 16px; color: var(--text);">${res.container}</strong>
            </div>
            <span style="font-size: 13px; color: var(--muted);">${res.timeScraped || ''}</span>
          </div>

          <!-- Stepper Visual -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0 24px 0; position:relative; overflow-x:auto; padding:10px 0; border-top: 1px solid rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.03);">
            ${stepsHtml}
          </div>

          <!-- Sub-abas -->
          <div class="sub-tabs-container" style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; gap:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px;">
              <button class="sub-tab-btn active" onclick="switchSubTab(this, 'situacao', '${res.container}')" style="background:none; border:none; color:var(--text); font-weight:600; font-size:13px; padding:6px 12px; cursor:pointer; border-bottom:2px solid #bc9855; outline:none; transition:all 0.2s;">Situação</button>
              <button class="sub-tab-btn" onclick="switchSubTab(this, 'detalhes', '${res.container}')" style="background:none; border:none; color:var(--muted); font-weight:500; font-size:13px; padding:6px 12px; cursor:pointer; border-bottom:2px solid transparent; outline:none; transition:all 0.2s;">Detalhes</button>
              <button class="sub-tab-btn" onclick="switchSubTab(this, 'agendamento', '${res.container}')" style="background:none; border:none; color:var(--muted); font-weight:500; font-size:13px; padding:6px 12px; cursor:pointer; border-bottom:2px solid transparent; outline:none; transition:all 0.2s;">Agendamento</button>
            </div>

            <!-- Tab Contents -->
            <div id="content-situacao-${res.container}" class="sub-tab-content" style="display:block; padding-top:4px;">
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                ${situacaoGrid}
              </div>
            </div>

            <div id="content-detalhes-${res.container}" class="sub-tab-content" style="display:none; padding-top:4px;">
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                ${detalhesGrid}
              </div>
              ${docTableHtml}
            </div>

            <div id="content-agendamento-${res.container}" class="sub-tab-content" style="display:none; padding-top:4px;">
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
                ${agendamentoGrid}
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
                <span style="color:var(--muted); font-size:12px; font-weight:600; display:block; margin-bottom:10px;">Timeline do Portão/Operação:</span>
                <div style="display:flex; justify-content:space-between; align-items:center; position:relative; padding:10px 0; overflow-x:auto;">
                  <div style="position:absolute; top:14px; left:40px; right:40px; height:2px; background:rgba(255,255,255,0.05); z-index:1;"></div>
                  ${timelineItems}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    html += `
      <div class="card" style="margin-bottom:0; padding:16px; border:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge ${badgeClass}">${res.api}</span>
            <strong style="font-size: 16px; color: var(--text);">${res.container}</strong>
          </div>
          <span style="font-size: 13px; color: var(--muted);">${res.timeScraped || ''}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
          <div><span style="color: var(--muted); font-size: 12px;">Status:</span> <div style="font-weight: 500; color: var(--text);">${res.status || 'N/A'}</div></div>
          <div><span style="color: var(--muted); font-size: 12px;">Peso Bruto:</span> <div style="font-weight: 500; color: var(--text);">${res.weight || 'N/A'}</div></div>
          <div><span style="color: var(--muted); font-size: 12px;">Tipo:</span> <div style="font-weight: 500; color: var(--text);">${res.type || 'N/A'}</div></div>
          <div><span style="color: var(--muted); font-size: 12px;">Navio / Viagem:</span> <div style="font-weight: 500; color: var(--text);">${res.vessel || 'N/A'}</div></div>
          <div><span style="color: var(--muted); font-size: 12px;">Booking / Reserva:</span> <div style="font-weight: 500; color: var(--text);">${res.booking || 'N/A'}</div></div>
          <div><span style="color: var(--muted); font-size: 12px;">Localização:</span> <div style="font-weight: 500; color: var(--text);">${res.location || 'N/A'}</div></div>
        </div>
        
        ${res.history && res.history.length > 0 ? `
          <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
            <span style="color: var(--muted); font-size: 12px; display:block; margin-bottom:6px;">Histórico do Contêiner:</span>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; max-height: 150px; overflow-y: auto; padding-right: 8px;">
              ${res.history.map(h => `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.02); padding-bottom: 4px;">
                  <span style="color: var(--text);">${h.event || ''}</span>
                  <span style="color: var(--muted); font-size: 12px;">${h.date || ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  html += `</div>`;
  resultsArea.innerHTML = html;
}

window.switchSubTab = function(btnElement, tabName, containerCode) {
  const container = btnElement.parentElement;
  const buttons = container.querySelectorAll('.sub-tab-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.style.color = 'var(--muted)';
    btn.style.fontWeight = '500';
    btn.style.borderBottom = '2px solid transparent';
  });
  
  btnElement.classList.add('active');
  btnElement.style.color = 'var(--text)';
  btnElement.style.fontWeight = '600';
  btnElement.style.borderBottom = '2px solid #bc9855';
  
  const card = container.closest('.card');
  const contents = card.querySelectorAll('.sub-tab-content');
  contents.forEach(content => {
    content.style.display = 'none';
  });
  
  const targetContent = card.querySelector(`#content-${tabName}-${containerCode}`);
  if (targetContent) {
    targetContent.style.display = 'block';
  }
};

window.reSearchContainer = function(containerCode, port) {
  const containerInput = document.getElementById('lplContainerInput');
  if (containerInput) {
    containerInput.value = containerCode;
  }
  
  if (port) {
    const card = document.getElementById(`api-card-${port.toLowerCase()}`);
    if (card) {
      card.click();
      return;
    }
  }
  
  const searchBtn = document.getElementById('lplSearchBtn');
  if (searchBtn) {
    searchBtn.click();
  }
};

function showBookmarkletModal() {
  const existing = document.getElementById('lplBookmarkletModal');
  if (existing) {
    existing.style.display = 'flex';
    return;
  }
  
  const origin = window.location.origin;
  const jsCode = `javascript:(async()=>{const u=document.getElementById('email')||document.querySelector('input[type=email]')||document.querySelector('input[name=username]');const p=document.getElementById('password')||document.querySelector('input[type=password]')||document.querySelector('input[name=password]');if(u&&p&&!document.cookie.includes('access_token_portal=')){let su=localStorage.getItem('lpl_tcp_user');let sp=localStorage.getItem('lpl_tcp_pass');if(!su||!sp){su=prompt('Insira seu e-mail/login do portal TCP:')||'';sp=prompt('Insira sua senha do portal TCP:')||'';if(su&&sp){localStorage.setItem('lpl_tcp_user',su);localStorage.setItem('lpl_tcp_pass',sp)}}if(su&&sp){u.value=su;p.value=sp;u.dispatchEvent(new Event('input',{bubbles:true}));p.dispatchEvent(new Event('input',{bubbles:true}));alert('Credenciais preenchidas! Clique em Entrar e, apos logar, clique neste favorito de novo para sincronizar.');return}}const t=document.cookie.split('; ').find(c=>c.startsWith('access_token_portal='));if(!t){alert('Erro: Faca login no portal do TCP primeiro, ou clique aqui para preencher as credenciais!');return}const cookiesArray=document.cookie.split('; ').map(c=>{const parts=c.split('=');return{name:parts[0].trim(),value:parts.slice(1).join('='),domain:'.tcp.com.br',path:'/'}});try{const res=await fetch('${origin}/api/upload-cookies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'tcp',cookies:cookiesArray})});const d=await res.json();if(res.ok&&d.success){alert('Cookies do TCP sincronizados com sucesso!')}else{alert('Erro ao importar: '+(d.error||'Erro no servidor'))}}catch(err){alert('Erro ao enviar para o servidor: '+err.message)}})();`;

  const modal = document.createElement('div');
  modal.id = 'lplBookmarkletModal';
  modal.style = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(5px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    transition: all 0.3s ease;
  `;
  
  modal.innerHTML = `
    <div class="card" style="max-width: 500px; padding: 28px; border: 1px solid var(--border); background: var(--card-bg); border-radius: 12px; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <button onclick="document.getElementById('lplBookmarkletModal').style.display='none'" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; outline: none;">✕</button>
      <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--text);">Sincronizador de 1 Clique — TCP</h3>
      <p style="color: var(--muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
        Esta é a forma mais prática para qualquer usuário sincronizar a sessão do TCP com a nuvem sem precisar baixar arquivos ou mexer em código!
      </p>
      
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <span style="font-weight: bold; color: var(--text); font-size: 13px; display: block; margin-bottom: 8px;">Como Usar:</span>
        <ol style="color: var(--muted); font-size: 13px; margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; text-align: left;">
          <li>
            <strong>Arraste o botão dourado abaixo</strong> para a sua barra de favoritos do navegador.
          </li>
          <li>
            Acesse o portal da TCP em <a href="https://portal.tcp.com.br" target="_blank" style="color: #bc9855; text-decoration: underline;">portal.tcp.com.br</a> e faça login (com a empresa Marfrig selecionada).
          </li>
          <li>
            Dentro do portal da TCP, clique no favorito <strong>"Sincronizar TCP"</strong> na sua barra de favoritos.
          </li>
          <li>
            Pronto! A sessão da nuvem será atualizada na mesma hora e você verá o aviso de sucesso.
          </li>
        </ol>
      </div>
      
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <a href="${jsCode}" class="nav-btn active" style="margin: 0; display: inline-flex; align-items: center; gap: 6px; font-weight: bold; padding: 12px 24px; cursor: move; border-radius: 6px;" title="Arraste para sua barra de favoritos" onclick="event.preventDefault(); alert('Não clique aqui. Arraste este botão para a sua barra de favoritos do navegador!');">
          🔗 Sincronizar TCP
        </a>
        <span style="font-size: 11px; color: var(--muted); text-align: center;">Dica: Clique e segure no botão acima, e solte-o na sua barra de favoritos (pressione Ctrl+Shift+B se ela não estiver visível).</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ==========================================
// FUNÇÕES PARA GESTÃO DE PROCESSOS
// ==========================================

let currentProcessosData = []; // Cache do front-end para aba ativa

function renderGestaoProcessos(){
  const loggedInUser = sessionStorage.getItem('lpl_user') || 'Usuário';
  renderGestaoProcessosDashboard(loggedInUser);
}

function renderGestaoProcessosDashboard(username){
  contentArea.innerHTML = `
    <div class="card" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-bg);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
        <h2 style="margin: 0; color: var(--text);">Gestão de Processos</h2>
      </div>

      <!-- KPIs Summary -->
      <div class="kpi-container">
        <div class="kpi-card" id="kpi-embarque">
          <span class="kpi-title">Aguardando Embarque</span>
          <span class="kpi-value" id="val-kpi-embarque">-</span>
        </div>
        <div class="kpi-card" id="kpi-draft">
          <span class="kpi-title">Minutas (Draft)</span>
          <span class="kpi-value" id="val-kpi-draft">-</span>
        </div>
        <div class="kpi-card" id="kpi-due">
          <span class="kpi-title">Processos DU-E</span>
          <span class="kpi-value" id="val-kpi-due">-</span>
        </div>
        <div class="kpi-card" id="kpi-rodoviario">
          <span class="kpi-title">Fluxo Rodoviário</span>
          <span class="kpi-value" id="val-kpi-rodoviario">-</span>
        </div>
      </div>

      <!-- Search & Filters -->
      <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div class="field" style="flex: 1; min-width: 250px; margin-bottom: 0;">
          <input type="text" id="processosSearchInput" placeholder="Pesquisar por Contêiner, Booking, Exportador, Navio..." style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
        </div>
        <button id="processosSearchClearBtn" class="nav-btn" style="margin: 0; padding: 10px 16px; width: auto; border-radius: 6px;">Limpar Filtro</button>
      </div>

      <!-- Tabs -->
      <div class="process-tabs">
        <button class="process-tab-btn active" data-aba="AGUARDANDO EMBARQUE">Aguardando Embarque</button>
        <button class="process-tab-btn" data-aba="DRAFT">Minutas (Draft)</button>
        <button class="process-tab-btn" data-aba="DUE">DU-E</button>
        <button class="process-tab-btn" data-aba="RODOVIARIO">Rodoviário</button>
        <button class="process-tab-btn" data-aba="USO MARFRIG">Uso Marfrig</button>
      </div>

      <!-- Table Container -->
      <div id="processosTableArea">
        <div style="text-align: center; padding: 40px 0; color: var(--text);">
          <div class="spinner-inline" style="margin-bottom: 12px;"></div>
          <div>Carregando processos do Excel...</div>
        </div>
      </div>
    </div>
  `;



  // Carregar KPIs summary
  loadProcessosSummary();

  // Carregar aba ativa inicial
  let activeAba = "AGUARDANDO EMBARQUE";
  loadAbaData(activeAba);

  // Troca de Abas
  const tabBtns = document.querySelectorAll('.process-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAba = btn.dataset.aba;
      
      // Limpar campo de busca
      const searchInput = document.getElementById('processosSearchInput');
      if (searchInput) searchInput.value = '';
      
      loadAbaData(activeAba);
    });
  });

  // Filtragem na barra de busca
  const searchInput = document.getElementById('processosSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', () => {
      filterTableData(searchInput.value.trim());
    });
  }

  const clearBtn = document.getElementById('processosSearchClearBtn');
  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      if(searchInput) {
        searchInput.value = '';
        filterTableData('');
      }
    });
  }
}

async function loadProcessosSummary(){
  try {
    const res = await fetch('/api/processos/summary');
    if(res.ok) {
      const summary = await res.json();
      document.getElementById('val-kpi-embarque').textContent = summary['AGUARDANDO EMBARQUE'] || '0';
      document.getElementById('val-kpi-draft').textContent = summary['DRAFT'] || '0';
      document.getElementById('val-kpi-due').textContent = summary['DUE'] || '0';
      document.getElementById('val-kpi-rodoviario').textContent = summary['RODOVIARIO'] || '0';
    }
  } catch(err) {
    console.error('Error fetching processes summary:', err);
  }
}

async function loadAbaData(abaName){
  const tableArea = document.getElementById('processosTableArea');
  if(!tableArea) return;

  tableArea.innerHTML = `
    <div style="text-align: center; padding: 40px 0; color: var(--text);">
      <div class="spinner-inline" style="margin-bottom: 12px;"></div>
      <div>Carregando aba "${abaName}" do Excel...</div>
    </div>
  `;

  try {
    const res = await fetch(`/api/processos?aba=${encodeURIComponent(abaName)}`);
    if(res.ok) {
      currentProcessosData = await res.json();
      renderProcessosTable(currentProcessosData, abaName);
    } else {
      const errorMsg = await res.json();
      tableArea.innerHTML = `<div style="padding: 20px; color: #ff4a5a; text-align: center; border: 1px dashed #ff4a5a; border-radius: 8px;">Erro ao carregar dados: ${errorMsg.message || 'Erro interno no servidor.'}</div>`;
    }
  } catch(err) {
    console.error('Error loading tab data:', err);
    tableArea.innerHTML = `<div style="padding: 20px; color: #ff4a5a; text-align: center; border: 1px dashed #ff4a5a; border-radius: 8px;">Falha na conexão com o servidor.</div>`;
  }
}

function getAbaColumns(abaName){
  if (abaName === "AGUARDANDO EMBARQUE") {
    return [
      { key: 'EXP', label: 'EXP' },
      { key: 'EXPORTADOR', label: 'Exportador' },
      { key: 'IMPORTADOR', label: 'Importador' },
      { key: 'CONTAINER', label: 'Contêiner' },
      { key: 'NAVIO', label: 'Navio' },
      { key: 'BOOKING', label: 'Booking' },
      { key: 'DATA ESTUFAGEM', label: 'Estufagem' },
      { key: 'D/L CARGA', label: 'D/L Carga' },
      { key: 'ETA', label: 'ETA' },
      { key: 'ORIGEM', label: 'Origem' },
      { key: 'DESTINO', label: 'Destino' },
      { key: 'ARMADOR', label: 'Armador' }
    ];
  } else if (abaName === "DRAFT") {
    return [
      { key: 'EXP', label: 'EXP' },
      { key: 'EXPORTADOR', label: 'Exportador' },
      { key: 'CONTAINER', label: 'Contêiner' },
      { key: 'NAVIO', label: 'Navio' },
      { key: 'BOOKING', label: 'Booking' },
      { key: 'D/L DRAFT', label: 'D/L Draft' },
      { key: 'D/L CARGA', label: 'D/L Carga' },
      { key: 'ORIGEM', label: 'Origem' },
      { key: 'DESTINO', label: 'Destino' },
      { key: 'ARMADOR', label: 'Armador' },
      { key: 'RUC', label: 'RUC' },
      { key: 'CONFERIDO', label: 'Conferido' },
      { key: 'ENVIADO', label: 'Enviado' }
    ];
  } else if (abaName === "DUE") {
    return [
      { key: 'EXP', label: 'EXP' },
      { key: 'EXPORTADOR', label: 'Exportador' },
      { key: 'CONTAINER', label: 'Contêiner' },
      { key: 'NAVIO', label: 'Navio' },
      { key: 'D/L CARGA', label: 'D/L Carga' },
      { key: 'ARMADOR', label: 'Armador' },
      { key: 'ORIGEM', label: 'Origem' },
      { key: 'DESTINO', label: 'Destino' },
      { key: 'RUC', label: 'RUC' },
      { key: 'DUE', label: 'DUE' },
      { key: 'Nº DUE', label: 'Nº DUE' },
      { key: 'DATA REGISTRO', label: 'Registro' },
      { key: 'LPCO', label: 'LPCO' }
    ];
  } else if (abaName === "RODOVIARIO") {
    return [
      { key: 'EXP', label: 'EXP' },
      { key: 'EXPORTADOR', label: 'Exportador' },
      { key: 'RUC', label: 'RUC' },
      { key: 'IMPORTADOR', label: 'Importador' },
      { key: 'FRONTEIRA', label: 'Fronteira' },
      { key: 'DESTINO', label: 'Destino' },
      { key: 'PAÍS', label: 'País' },
      { key: 'TRANSPORTADORA', label: 'Transportadora' },
      { key: 'CAVALO', label: 'Cavalo' },
      { key: 'CARRETA', label: 'Carreta' },
      { key: 'DUE', label: 'DUE' },
      { key: 'LIBERAÇÃO - BR', label: 'Liberação BR' }
    ];
  } else { // USO MARFRIG
    return [
      { key: 'Referência', label: 'Referência' },
      { key: 'Exportador', label: 'Exportador' },
      { key: 'Container', label: 'Contêiner' },
      { key: 'Navio', label: 'Navio' },
      { key: 'Importador', label: 'Importador' },
      { key: 'D/L Carga', label: 'D/L Carga' },
      { key: 'ETA', label: 'ETA' },
      { key: 'Terminal Atracação', label: 'Terminal' },
      { key: 'Booking', label: 'Booking' },
      { key: 'Origem', label: 'Origem' },
      { key: 'Destino', label: 'Destino' },
      { key: 'Armador', label: 'Armador' },
      { key: 'Produto', label: 'Produto' },
      { key: 'DUE/RUC', label: 'DUE/RUC' }
    ];
  }
}

function renderProcessosTable(data, abaName, term = '', matchingCount = 0){
  const tableArea = document.getElementById('processosTableArea');
  if(!tableArea) return;

  if (data.length === 0) {
    tableArea.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--muted);">Nenhum processo encontrado.</div>`;
    return;
  }

  const cols = getAbaColumns(abaName);
  
  let countText = '';
  if (term) {
    countText = `Exibindo <strong>${data.length}</strong> registro(s) (<strong>${matchingCount}</strong> em destaque no topo).`;
  } else {
    countText = `Exibindo <strong>${data.length}</strong> registro(s).`;
  }
  
  let html = `
    <div style="margin-bottom: 10px; font-size: 13px; color: var(--muted);">${countText}</div>
    <div class="process-table-container">
      <table class="process-table">
        <thead>
          <tr>
            ${cols.map(c => `<th>${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="processosTableBody">
          ${data.map((row, index) => {
            let rowClass = '';
            if (term) {
              if (index < matchingCount) {
                rowClass = 'row-highlight';
              } else {
                rowClass = 'row-dimmed';
              }
            }
            return `
              <tr class="${rowClass}">
                ${cols.map(c => {
                  const val = row[c.key] === undefined || row[c.key] === null ? '' : row[c.key];
                  return `<td title="${val}">${val}</td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  tableArea.innerHTML = html;
}

function filterTableData(query){
  const activeBtn = document.querySelector('.process-tab-btn.active');
  if (!activeBtn) return;
  const abaName = activeBtn.dataset.aba;
  
  const term = query.toLowerCase().trim();
  
  if (!term) {
    renderProcessosTable(currentProcessosData, abaName, '', 0);
    return;
  }

  const fieldsToFilter = [
    'CONTAINER', 'Container', 'BOOKING', 'Booking', 
    'EXPORTADOR', 'Exportador', 'NAVIO', 'Navio', 
    'EXP', 'Referência', 'RUC', 'DUE', 'Nº DUE', 'DUE/RUC',
    'IMPORTADOR', 'Importador', 'Produto'
  ];

  const matchingRows = [];
  const nonMatchingRows = [];

  currentProcessosData.forEach(row => {
    const isMatch = fieldsToFilter.some(field => {
      const val = row[field];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(term);
    });
    
    if (isMatch) {
      matchingRows.push(row);
    } else {
      nonMatchingRows.push(row);
    }
  });

  const orderedData = [...matchingRows, ...nonMatchingRows];
  renderProcessosTable(orderedData, abaName, term, matchingRows.length);
}

// --- ÁREA ADMINISTRATIVA: GESTÃO DE USUÁRIOS ---

async function renderAdmin() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0; color: var(--text);">Gestão de Usuários (Área Admin)</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--muted);">Cadastre, edite e configure permissões de acesso do sistema</p>
        </div>
        <button class="nav-btn active" style="width: auto; padding: 10px 20px; font-weight: 600;" onclick="openUserModal()">➕ Novo Usuário</button>
      </div>
      
      <div class="process-table-container">
        <table class="process-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Login</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Permissões</th>
              <th style="text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody id="adminUsersTableBody">
            <tr>
              <td colspan="6" style="text-align: center; padding: 20px; color: var(--muted);">Carregando usuários...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  await loadAdminUsers();
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  
  try {
    const token = sessionStorage.getItem('lpl_token');
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Acesso negado. Faça login novamente.</td></tr>`;
        return;
      }
      throw new Error('Erro ao carregar usuários');
    }
    
    const users = await response.json();
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted);">Nenhum usuário cadastrado.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = users.map(u => {
      const perms = [];
      if (u.is_admin) perms.push('<span class="admin-badge admin-badge-admin">Admin</span>');
      if (u.can_view_processes) perms.push('<span class="admin-badge admin-badge-yes">Planilhas</span>');
      if (u.can_query_ports) perms.push('<span class="admin-badge admin-badge-yes">Portos</span>');
      if (u.can_upload_cookies) perms.push('<span class="admin-badge admin-badge-yes">Cookies</span>');
      
      const statusBadge = u.ativo !== false 
        ? '<span class="admin-badge admin-badge-yes">Ativo</span>' 
        : '<span class="admin-badge admin-badge-no">Inativo</span>';
        
      return `
        <tr>
          <td>${u.id}</td>
          <td style="font-weight: 600;">${u.login}</td>
          <td>${u.email || '-'}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${perms.join('') || '<span class="admin-badge admin-badge-no">Nenhuma</span>'}
            </div>
          </td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button class="admin-action-btn" onclick="openUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">✏️ Editar</button>
              <button class="admin-action-btn" onclick="resetUserPassword(${u.id}, '${u.login}')">🔑 Resetar Senha</button>
              ${u.ativo !== false 
                ? `<button class="admin-action-btn admin-action-btn-danger" onclick="toggleUserStatus(${u.id}, false, '${u.login}')">🔒 Inativar</button>` 
                : `<button class="admin-action-btn" style="border-color: rgba(16, 185, 129, 0.4); color: #34d399;" onclick="toggleUserStatus(${u.id}, true, '${u.login}')">🔓 Ativar</button>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Erro ao carregar os dados.</td></tr>`;
  }
}

function openUserModal(user = null) {
  // Remover modal existente se houver
  closeUserModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'userModalBackdrop';
  
  const isEdit = !!user;
  const modalTitle = isEdit ? 'Editar Usuário' : 'Novo Usuário';
  
  backdrop.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>${modalTitle}</h3>
        <button class="modal-close-btn" onclick="closeUserModal()">&times;</button>
      </div>
      <form id="modalUserForm">
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="field" style="width: 100%;">
            <label>Nome de Usuário (Login)</label>
            <input type="text" id="modalLogin" required value="${isEdit ? user.login : ''}" placeholder="Ex: luciano.vs" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
          </div>
          
          <div class="field" style="width: 100%;">
            <label>E-mail comercial</label>
            <input type="email" id="modalEmail" required value="${isEdit ? user.email || '' : ''}" placeholder="Ex: usuario@lplcomissaria.com.br" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
          </div>
          
          <div class="field" style="width: 100%;">
            <label>Senha (Deixe em branco para manter atual ou enviar e-mail de definição)</label>
            <div class="password-wrapper">
              <input type="password" id="modalPassword" placeholder="Senha de 6 a 15 caracteres (opcional)" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); outline: none;">
              <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('modalPassword', this)" tabIndex="-1">👁️</button>
            </div>
          </div>
          
          <div class="admin-checkbox-group">
            <label class="admin-checkbox-label">
              <input type="checkbox" id="modalIsAdmin" ${isEdit && user.is_admin ? 'checked' : ''}>
              <strong>Administrador Geral</strong>
            </label>
            
            <label class="admin-checkbox-label">
              <input type="checkbox" id="modalCanViewProcesses" ${!isEdit || user.can_view_processes ? 'checked' : ''}>
              Ver Processos / Gestão (LPL Planilha e Excel)
            </label>
            
            <label class="admin-checkbox-label">
              <input type="checkbox" id="modalCanQueryPorts" ${!isEdit || user.can_query_ports ? 'checked' : ''}>
              Consultar Terminais dos Portos (Scraper)
            </label>
            
            <label class="admin-checkbox-label">
              <input type="checkbox" id="modalCanUploadCookies" ${isEdit && user.can_upload_cookies ? 'checked' : ''}>
              Sincronizar Cookies (TCP/Tecon/Portonave)
            </label>

            <label class="admin-checkbox-label" style="margin-top: 6px; border-top: 1px solid var(--border); padding-top: 10px;">
              <input type="checkbox" id="modalAtivo" ${!isEdit || user.ativo !== false ? 'checked' : ''}>
              <strong>Conta Ativa</strong> (Permitir login)
            </label>
          </div>
          
          <div id="modalErrorAlert" style="display: none; background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 13px; text-align: center;"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="admin-action-btn" onclick="closeUserModal()">Cancelar</button>
          <button type="submit" class="admin-action-btn active" style="background: var(--btn-active-bg); color: var(--btn-active-color); border-color: var(--btn-active-bg);">Salvar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(backdrop);
  
  const form = document.getElementById('modalUserForm');
  if (form) {
    form.addEventListener('submit', (e) => saveUser(e, isEdit ? user.id : null));
  }
}

function closeUserModal() {
  const modal = document.getElementById('userModalBackdrop');
  if (modal) modal.remove();
}

async function saveUser(e, userId) {
  e.preventDefault();
  
  const login = document.getElementById('modalLogin').value.trim();
  const email = document.getElementById('modalEmail').value.trim();
  const senha = document.getElementById('modalPassword').value;
  const is_admin = document.getElementById('modalIsAdmin').checked;
  const can_view_processes = document.getElementById('modalCanViewProcesses').checked;
  const can_query_ports = document.getElementById('modalCanQueryPorts').checked;
  const can_upload_cookies = document.getElementById('modalCanUploadCookies').checked;
  const ativo = document.getElementById('modalAtivo').checked;
  const errorDiv = document.getElementById('modalErrorAlert');
  
  // Validações básicas
  if (senha && (senha.length < 6 || senha.length > 15)) {
    errorDiv.textContent = 'A senha deve conter entre 6 e 15 caracteres.';
    errorDiv.style.display = 'block';
    return;
  }
  
  const token = sessionStorage.getItem('lpl_token');
  const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
  const method = userId ? 'PUT' : 'POST';
  
  const payload = {
    login,
    email,
    is_admin,
    can_view_processes,
    can_query_ports,
    can_upload_cookies,
    ativo
  };
  if (senha) payload.senha = senha;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (response.ok) {
      closeUserModal();
      loadAdminUsers();
    } else {
      errorDiv.textContent = result.error || 'Erro ao salvar usuário.';
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Erro ao conectar ao servidor.';
    errorDiv.style.display = 'block';
  }
}

async function toggleUserStatus(userId, status, username) {
  const actionText = status ? 'ativar' : 'inativar';
  if (!confirm(`Tem certeza de que deseja ${actionText} o usuário "${username}"?`)) {
    return;
  }
  
  const token = sessionStorage.getItem('lpl_token');
  try {
    const usersResponse = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await usersResponse.json();
    const userObj = users.find(u => u.id === userId);
    if (!userObj) return;

    const payload = {
      ...userObj,
      ativo: status
    };

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      loadAdminUsers();
    } else {
      const resJson = await response.json();
      alert(resJson.error || 'Erro ao alterar status do usuário.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro de rede ao alterar status.');
  }
}

async function resetUserPassword(userId, username) {
  if (!confirm(`Tem certeza de que deseja resetar a senha do usuário "${username}"? Uma nova senha temporária será gerada e enviada por e-mail.`)) {
    return;
  }
  
  const token = sessionStorage.getItem('lpl_token');
  try {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    if (response.ok && result.success) {
      alert(result.message);
    } else {
      alert(result.error || 'Erro ao resetar senha.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro de rede ao resetar senha.');
  }
}

async function renderPerfil() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="card" style="max-width: 600px; margin: 0 auto 24px auto;">
      <h2 style="margin-bottom: 20px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px;">Meu Perfil</h2>
      
      <div id="profileAlertArea" style="margin-bottom: 15px;"></div>
      
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="field">
          <label style="font-weight: 600; margin-bottom: 6px; display: block;">Nome de Usuário (Login)</label>
          <input type="text" id="profileLoginInput" class="form-control" style="width: 100%;" placeholder="Digite seu nome de usuário">
        </div>
        
        <div class="field">
          <label style="font-weight: 600; margin-bottom: 6px; display: block;">E-mail <span style="font-size: 11px; color: var(--muted); font-weight: normal;">(Alterável apenas no Painel Admin)</span></label>
          <input type="email" id="profileEmailInput" class="form-control" style="width: 100%; background-color: var(--border); cursor: not-allowed;" disabled>
        </div>
        
        <hr style="border: 0; border-top: 1px solid var(--border); margin: 10px 0;">
        
        <p style="font-size: 13px; color: var(--muted); margin: 0;">Para alterar sua senha, preencha os campos abaixo. Deixe em branco se deseja manter a atual.</p>
        
        <div class="field">
          <label style="font-weight: 600; margin-bottom: 6px; display: block;">Nova Senha</label>
          <div style="position: relative;">
            <input type="password" id="profilePasswordInput" class="form-control" style="width: 100%;" placeholder="Digite a nova senha (mín. 6 caracteres)">
            <span id="toggleProfilePassEye" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 16px; user-select: none;">👁️</span>
          </div>
        </div>
        
        <div class="field">
          <label style="font-weight: 600; margin-bottom: 6px; display: block;">Confirmar Nova Senha</label>
          <div style="position: relative;">
            <input type="password" id="profileConfirmPasswordInput" class="form-control" style="width: 100%;" placeholder="Confirme a nova senha">
            <span id="toggleProfileConfirmPassEye" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 16px; user-select: none;">👁️</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="btnCancelProfile" style="padding: 10px 20px;">Cancelar</button>
          <button class="btn btn-success" id="btnSaveProfile" style="padding: 10px 20px;">Salvar Alterações</button>
        </div>
      </div>
    </div>
  `;

  // Preencher dados iniciais do usuário
  const token = sessionStorage.getItem('lpl_token');
  try {
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      document.getElementById('profileLoginInput').value = data.login || '';
      document.getElementById('profileEmailInput').value = data.email || '';
    } else {
      document.getElementById('profileAlertArea').innerHTML = `
        <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
          Erro ao obter os dados do seu perfil do servidor.
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }

  // Toggle de visibilidade da senha
  const passInput = document.getElementById('profilePasswordInput');
  const togglePass = document.getElementById('toggleProfilePassEye');
  if (togglePass && passInput) {
    togglePass.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        togglePass.textContent = '🙈';
      } else {
        passInput.type = 'password';
        togglePass.textContent = '👁️';
      }
    });
  }

  const confirmPassInput = document.getElementById('profileConfirmPasswordInput');
  const toggleConfirmPass = document.getElementById('toggleProfileConfirmPassEye');
  if (toggleConfirmPass && confirmPassInput) {
    toggleConfirmPass.addEventListener('click', () => {
      if (confirmPassInput.type === 'password') {
        confirmPassInput.type = 'text';
        toggleConfirmPass.textContent = '🙈';
      } else {
        confirmPassInput.type = 'password';
        toggleConfirmPass.textContent = '👁️';
      }
    });
  }

  // Botão Cancelar
  const btnCancel = document.getElementById('btnCancelProfile');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      const dueBtn = document.querySelector('.sidebar [data-page="due"]');
      if (dueBtn) dueBtn.click();
      else loadPage('due');
    });
  }

  // Botão Salvar
  const btnSave = document.getElementById('btnSaveProfile');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const login = document.getElementById('profileLoginInput').value.trim();
      const senha = document.getElementById('profilePasswordInput').value;
      const confirmSenha = document.getElementById('profileConfirmPasswordInput').value;
      const alertArea = document.getElementById('profileAlertArea');

      alertArea.innerHTML = '';

      if (!login) {
        alertArea.innerHTML = `
          <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
            O nome de usuário é obrigatório.
          </div>
        `;
        return;
      }

      if (senha) {
        if (senha.length < 6 || senha.length > 15) {
          alertArea.innerHTML = `
            <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
              A senha deve conter entre 6 e 15 caracteres.
            </div>
          `;
          return;
        }
        if (senha !== confirmSenha) {
          alertArea.innerHTML = `
            <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
              As senhas digitadas não coincidem.
            </div>
          `;
          return;
        }
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Salvando...';

      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ login, senha })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Atualizar o token e o nome de usuário no sessionStorage
          sessionStorage.setItem('lpl_token', result.token);
          sessionStorage.setItem('lpl_user', result.user);
          
          alertArea.innerHTML = `
            <div class="alert alert-success" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #22c55e; background: #f0fdf4; border: 1px solid #dcfce7;">
              Perfil atualizado com sucesso!
            </div>
          `;

          // Atualizar a barra lateral
          renderSidebar();
          
          setTimeout(() => {
            const dueBtn = document.querySelector('.sidebar [data-page="due"]');
            if (dueBtn) dueBtn.click();
            else loadPage('due');
          }, 1500);
        } else {
          alertArea.innerHTML = `
            <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
              ${result.error || 'Erro ao atualizar perfil.'}
            </div>
          `;
          btnSave.disabled = false;
          btnSave.textContent = 'Salvar Alterações';
        }
      } catch (err) {
        console.error(err);
        alertArea.innerHTML = `
          <div class="alert alert-danger" style="padding: 12px; border-radius: 6px; margin-bottom: 15px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2;">
            Erro de rede ao salvar alterações.
          </div>
        `;
        btnSave.disabled = false;
        btnSave.textContent = 'Salvar Alterações';
      }
    });
  }
}

// Iniciar verificação de autenticação ao carregar a página
checkAuth();
