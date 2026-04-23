// Navegação
// Injetar botão "Gerar Planilha" se não existir
const firstNavBtn = document.querySelector('.nav-btn');
if(firstNavBtn && firstNavBtn.parentNode && !document.querySelector('[data-page="planilha"]')){
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  btn.dataset.page = 'planilha';
  btn.textContent = 'Gerar Planilha';
  firstNavBtn.parentNode.appendChild(btn);
}

const navButtons = document.querySelectorAll('.nav-btn');
const contentArea = document.getElementById('content-area');
const greenAccessPassword = 'Luiggi9654';
const greenTestSampleData = [
  { id: 1, pedido:'0001', cliente:'Cliente A', cnpj:'12.345.678/0001-90', valor: 2450.50, status:'pendente' },
  { id: 2, pedido:'0002', cliente:'Cliente B', cnpj:'98.765.432/0001-10', valor: 1780.75, status:'em processamento' }
];

// Alterar nome do botão Teste para Calculo de Itens
navButtons.forEach(btn => {
  if(btn.dataset.page === 'teste') btn.textContent = 'Calculo de Itens';
});

// Modo tema (padrão: dark)
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme){
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');
  if(themeToggle) themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
}
// carregar preferência
const savedTheme = localStorage.getItem('site-theme') || 'dark';
applyTheme(savedTheme);
if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('site-theme', next);
  });
}

function requestGreenAccess(){
  const answer = prompt('Digite a senha para acessar o Green Teste:');
  if(answer === null) return false;
  if(answer.trim() === greenAccessPassword) return true;
  alert('Senha incorreta. Acesso negado.');
  return false;
}

navButtons.forEach(btn => btn.addEventListener('click', () => {
  if(btn.dataset.page === 'green' && !requestGreenAccess()){
    return;
  }

  navButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadPage(btn.dataset.page);
}));

function loadPage(page){
  if(page === 'due') renderDue();
  else if(page === 'planilha') renderPlanilha();
  else if(page === 'green') renderGreenTest();
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
