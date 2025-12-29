// Navegação
const navButtons = document.querySelectorAll('.nav-btn');
const contentArea = document.getElementById('content-area');

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
          <input id="valorNota" type="number" step="any" placeholder="0,00">
        </div>
        <div class="field field-small">
          <label>Taxa da moeda</label>
          <input id="taxaMoeda" type="number" step="any" placeholder="0,00">
        </div>
        <div class="output" id="valorConvertido">Valor convertido: 0,00</div>
      </div>

      <hr>

      <div class="row">
        <div class="field field-small">
          <label>Peso líquido</label>
          <input id="pesoLiquido" type="number" step="any" placeholder="0,00">
        </div>
        <div class="field field-small">
          <label>Valor unitário</label>
          <input id="valorUnitario" type="number" step="any" placeholder="0,00">
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
              <input id="frete" type="number" step="any" placeholder="0,00">
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
              <input id="seguro" type="number" step="any" placeholder="0,00">
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
      <h2>Teste</h2>
      <p>Esta é a página de teste. Você pode adicionar conteúdo aqui.</p>
    </div>
  `;
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


  function calcConvertido(){
    const v = parseFloat(valorNota.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    const result = v / t;
    valorConvertido.textContent = 'Valor convertido: ' + (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcTotais(){
    const p = parseFloat(pesoLiquido.value) || 0;
    const u = parseFloat(valorUnitario.value) || 0;
    const prod = p * u;
    totalComMilhares.textContent = (isFinite(prod) ? fmtWithThousands.format(prod) : '0,00');
    totalSemMilhares.textContent = (isFinite(prod) ? fmtNoThousands.format(prod) : '0,00');
  }

  function calcFrete(){
    const f = parseFloat(frete.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    let result = f;
    if(swConverter && swConverter.checked){
      result = t !== 0 ? f / t : 0;
    }
    freteConvertido.textContent = (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
    if(freteComMilhares) freteComMilhares.textContent = (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcSeguro(){
    const s = parseFloat(seguro.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    let result = s;
    if(swConverter && swConverter.checked){
      result = t !== 0 ? s / t : 0;
    }
    seguroConvertido.textContent = (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
    if(seguroComMilhares) seguroComMilhares.textContent = (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcFinal(){
    const v = parseFloat(valorNota.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    const f = parseFloat(frete.value) || 0;
    const s = parseFloat(seguro.value) || 0;
    const valorConv = v * t;
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
