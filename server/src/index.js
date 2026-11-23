import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import pubblico from './pubblico.js';
import admin from './admin.js';

const qui = path.dirname(fileURLToPath(import.meta.url));
const SITO = process.env.SITO_DIR || path.resolve(qui, '../../sito/dist');
const GEST = process.env.GESTIONALE_DIR || path.resolve(qui, '../../gestionale/dist');
const PORTA = Number(process.env.PORT) || 3000;

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

app.use('/api', (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api', pubblico);
app.use('/api/admin', admin);
app.use('/api', (req, res) => res.status(404).json({ errore: 'Percorso non trovato' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const code = err.code && Number.isInteger(err.code) ? err.code : (err.type === 'entity.parse.failed' ? 400 : 500);
  if (code >= 500) console.error(err);
  res.status(code).json({ errore: code >= 500 ? 'Errore del server, riprova.' : err.message });
});

function spa(prefisso, dir) {
  if (!fs.existsSync(dir)) return;
  app.use(prefisso, express.static(dir, {
    index: false,
    setHeaders: (res, f) => {
      if (f.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else res.set('Cache-Control', 'no-cache');
    },
  }));
  app.get(prefisso === '/' ? '*' : `${prefisso}*`, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dir, 'index.html'));
  });
}
app.use((req, res, next) => (req.path === '/gestionale' ? res.redirect(301, '/gestionale/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')) : next()));
spa('/gestionale', GEST);
spa('/', SITO);

app.listen(PORTA, () => {
  console.log(`Larosa in ascolto su http://localhost:${PORTA}`);
  console.log(`  sito         → http://localhost:${PORTA}/`);
  console.log(`  gestionale   → http://localhost:${PORTA}/gestionale/`);
});
