const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\LVS 06 Dev\\Downloads\\Gestão de Processos - MARFRIG x DESPACHANTES.xlsx';

function excelDateToDateString(excelSerial) {
  if (!excelSerial || isNaN(excelSerial)) return excelSerial;
  // Excel datas começam em 30 de dezembro de 1899 devido a um bug bissexto herdado do Lotus 1-2-3
  const date = new Date((excelSerial - 25569) * 86400 * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

try {
  console.log(`Lendo planilha de: ${filePath}...`);
  const start = Date.now();
  const workbook = XLSX.readFile(filePath);
  console.log(`Planilha lida em ${Date.now() - start}ms.`);

  const abas = ["AGUARDANDO EMBARQUE", "DRAFT", "DUE", "RODOVIARIO", "USO MARFRIG"];
  
  abas.forEach(name => {
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      console.log(`Aba "${name}" não localizada.`);
      return;
    }
    
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    console.log(`\nAba: "${name}" | Total de Registros: ${rows.length}`);
    
    // Validar formatação do primeiro registro
    if (rows.length > 0) {
      const reg = rows[0];
      console.log("  Chaves do primeiro registro:", Object.keys(reg));
      // Tentar converter datas se houver algum campo de data comum
      const dataFields = ['ETA', 'ETS', 'DATA ESTUFAGEM', 'D/L Carga', 'D/L CARGA', 'LIBERAÇÃO - BR'];
      dataFields.forEach(f => {
        if (reg[f]) {
          console.log(`  Campo "${f}" original: ${reg[f]} | Formatado: ${excelDateToDateString(reg[f])}`);
        }
      });
    }
  });

} catch (err) {
  console.error("Erro no teste da API de processos:", err.message);
}
