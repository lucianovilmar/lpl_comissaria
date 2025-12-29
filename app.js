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
        <div class="output" id="valorConvertido">Valor convertido: R$ 0,00</div>
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
        <div style="display:flex;flex-direction:column;gap:6px;min-width:240px">
          <div class="small">Total (formatado com separador de milhares)</div>
          <div class="output" id="totalComMilhares">R$ 0,00</div>
          <div class="small">Total (sem separador de milhares)</div>
          <div class="output" id="totalSemMilhares">0,00</div>
        </div>
      </div>

      <hr>

      <div class="row">
        <div class="field field-small">
          <label>Frete</label>
          <input id="frete" type="number" step="any" placeholder="0,00">
        </div>
        <div class="output" id="freteConvertido">Frete / Taxa: 0,00</div>
      </div>
      <div class="row">
        <div class="field field-small">
          <label>Seguro</label>
          <input id="seguro" type="number" step="any" placeholder="0,00">
        </div>
        <div class="output" id="seguroConvertido">Seguro / Taxa: 0,00</div>
      </div>      
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
  const seguro = document.getElementById('seguro');
  const seguroConvertido = document.getElementById('seguroConvertido');


  function calcConvertido(){
    const v = parseFloat(valorNota.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    const result = v * t;
    valorConvertido.textContent = 'Valor convertido: ' + (isFinite(result) ? fmtWithThousands.format(result) : '0,00');
  }

  function calcTotais(){
    const p = parseFloat(pesoLiquido.value) || 0;
    const u = parseFloat(valorUnitario.value) || 0;
    const prod = p * u;
    totalComMilhares.textContent = (isFinite(prod) ? 'R$ ' + fmtWithThousands.format(prod) : 'R$ 0,00');
    totalSemMilhares.textContent = (isFinite(prod) ? fmtNoThousands.format(prod) : '0,00');
  }

  function calcFrete(){
    const f = parseFloat(frete.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    const result = t !== 0 ? f / t : 0;
    freteConvertido.textContent = 'Frete / Taxa: ' + (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
  }

  function calcSeguro(){
    const s = parseFloat(seguro.value) || 0;
    const t = parseFloat(taxaMoeda.value) || 0;
    const result = t !== 0 ? s / t : 0;
    seguroConvertido.textContent = 'Seguro / Taxa: ' + (isFinite(result) ? fmtNoThousands.format(result) : '0,00');
  }
  
  // Eventos
  [valorNota, taxaMoeda].forEach(el => el.addEventListener('input', calcConvertido));
  [pesoLiquido, valorUnitario].forEach(el => el.addEventListener('input', calcTotais));
  [frete, taxaMoeda].forEach(el => el.addEventListener('input', calcFrete));
  [seguro, taxaMoeda].forEach(el => el.addEventListener('input', calcSeguro));

  // executar cálculos iniciais
  calcConvertido();
  calcTotais();
  calcFrete();
}

// Inicializa com a página Due selecionada
loadPage('due');
