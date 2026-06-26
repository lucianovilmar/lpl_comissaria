const { trackContainer } = require('./ports-crawler');

const containerCode = process.argv[2] || 'LPLTEST1234';

console.log(`Iniciando busca do contêiner: ${containerCode}...`);

trackContainer(containerCode)
  .then(result => {
    console.log('\n--- RESULTADOS ---');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro na execução:', err);
    process.exit(1);
  });
