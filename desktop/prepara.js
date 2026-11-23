const fs = require('fs');
const path = require('path');
const sorgente = path.join(__dirname, '..', 'gestionale', 'dist');
const dest = path.join(__dirname, 'app');
if (!fs.existsSync(path.join(sorgente, 'index.html'))) {
  console.error('Manca la build del gestionale. Prima esegui: cd ../gestionale && npm install && npm run build');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(sorgente, dest, { recursive: true });
fs.rmSync(path.join(dest, 'sw.js'), { force: true });
console.log('Gestionale copiato nell\'app desktop.');
