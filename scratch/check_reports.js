const fs = require('fs');
const Papa = require('papaparse');

const csv = fs.readFileSync('reports.csv', 'utf8');
const results = Papa.parse(csv, { header: true });
const lastReport = results.data[results.data.length - 2]; 

console.log('--- DECISOES ESTRATEGICAS (Parsed) ---');
try {
    const d = JSON.parse(lastReport.decisoes_estrategicas);
    console.log(JSON.stringify(d[0], null, 2));
} catch(e) {
    console.log(lastReport.decisoes_estrategicas);
}

console.log('\n--- ANALISE POR CLOSER (Parsed) ---');
try {
    const a = JSON.parse(lastReport.analise_por_closer);
    console.log(JSON.stringify(a[0], null, 2));
} catch(e) {
    console.log(lastReport.analise_por_closer);
}
