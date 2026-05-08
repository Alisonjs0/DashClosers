const fs = require('fs');
const Papa = require('papaparse');

const csv = fs.readFileSync('reports.csv', 'utf8');
const results = Papa.parse(csv, { header: true });
const lastReport = results.data[results.data.length - 2]; // -1 might be empty line

if (lastReport && lastReport.analise_por_closer) {
    try {
        const analises = JSON.parse(lastReport.analise_por_closer);
        console.log('Closers in analise_por_closer:', analises.map(c => c.nome || c.closer));
    } catch (e) {
        console.log('Error parsing JSON:', e.message);
        console.log('Raw data snippet:', lastReport.analise_por_closer.substring(0, 100));
    }
} else {
    console.log('No analise_por_closer found in last report');
}
