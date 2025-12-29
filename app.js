// Navegação
const navButtons = document.querySelectorAll('.nav-btn');
const contentArea = document.getElementById('content-area');

// Alterar nome do botão Teste para Calculo de Itens
navButtons.forEach(btn => {
  if(btn.dataset.page !== 'due') btn.textContent = 'Calculo de Itens';
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

navButtons.forEach(btn => btn.addEventListener('click', () => {
  navButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadPage(btn.dataset.page);
}));

function loadPage(page){
  if(page === 'due') renderDue();
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

      // Cálculo: (Col2 / Taxa) * Col1
      const val3 = taxaVal !== 0 ? (val2 / taxaVal) * val1 : 0;
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
