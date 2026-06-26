const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\LVS 06 Dev\\Downloads\\Gestão de Processos - MARFRIG x DESPACHANTES.xlsx';

try {
  console.log(`Lendo arquivo: ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  
  const sheetNames = workbook.SheetNames;
  console.log('\n--- ABAS ENCONTRADAS ---');
  console.log(JSON.stringify(sheetNames, null, 2));

  sheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    // Converter para JSON de forma que possamos ver as chaves/colunas
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    
    console.log(`\nAba: "${name}" | Linhas: ${rowCount} | Colunas: ${colCount}`);

    // Ler as primeiras linhas
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
      console.log('  Cabeçalhos / Primeira Linha:', JSON.stringify(data[0].slice(0, 15)));
      if (data.length > 1) {
        console.log('  Exemplo de Dados (Linha 1):', JSON.stringify(data[1].slice(0, 15)));
      }
      if (data.length > 2) {
        console.log('  Exemplo de Dados (Linha 2):', JSON.stringify(data[2].slice(0, 15)));
      }
    } else {
      console.log('  Aba vazia ou sem dados legíveis.');
    }
  });

} catch (err) {
  console.error('Erro ao ler a planilha:', err.message);
}
