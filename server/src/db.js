import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { seed } from './seed.js';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'larosa.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS sedi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  indirizzo TEXT, cap TEXT, citta TEXT,
  telefono TEXT, telefono2 TEXT, whatsapp TEXT, email TEXT,
  orari TEXT NOT NULL DEFAULT '{}',
  attiva INTEGER NOT NULL DEFAULT 1,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  ruolo TEXT,
  bio TEXT,
  sede_id INTEGER REFERENCES sedi(id) ON DELETE SET NULL,
  colore TEXT NOT NULL DEFAULT '#d4a017',
  orari TEXT,
  servizi TEXT,
  prenotabile INTEGER NOT NULL DEFAULT 1,
  attivo INTEGER NOT NULL DEFAULT 1,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS servizi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descrizione TEXT,
  durata INTEGER NOT NULL DEFAULT 30,
  prezzo REAL,
  prezzo_max REAL,
  tipo_prezzo TEXT NOT NULL DEFAULT 'da',
  online INTEGER NOT NULL DEFAULT 1,
  attivo INTEGER NOT NULL DEFAULT 1,
  ordine INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS clienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cognome TEXT,
  telefono TEXT,
  email TEXT,
  note TEXT,
  compleanno TEXT,
  marketing INTEGER NOT NULL DEFAULT 0,
  creato_il TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS clienti_tel ON clienti(telefono) WHERE telefono IS NOT NULL AND telefono <> '';
CREATE TABLE IF NOT EXISTS prenotazioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codice TEXT NOT NULL UNIQUE,
  cliente_id INTEGER REFERENCES clienti(id) ON DELETE SET NULL,
  sede_id INTEGER REFERENCES sedi(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  data TEXT NOT NULL,
  inizio INTEGER NOT NULL,
  fine INTEGER NOT NULL,
  servizi TEXT NOT NULL DEFAULT '[]',
  prezzo_stimato REAL,
  prezzo_finale REAL,
  stato TEXT NOT NULL DEFAULT 'in_attesa',
  origine TEXT NOT NULL DEFAULT 'online',
  note_cliente TEXT,
  note_interne TEXT,
  creata_il TEXT NOT NULL DEFAULT (datetime('now')),
  aggiornata_il TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS pren_data ON prenotazioni(data, staff_id);
CREATE TABLE IF NOT EXISTS chiusure (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sede_id INTEGER REFERENCES sedi(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  dal TEXT NOT NULL,
  al TEXT NOT NULL,
  motivo TEXT
);
CREATE TABLE IF NOT EXISTS utenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  ruolo TEXT NOT NULL DEFAULT 'staff',
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  creato_il TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT
);
CREATE TABLE IF NOT EXISTS push (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utente_id INTEGER REFERENCES utenti(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  dati TEXT NOT NULL
);
`);

const DEFAULTS = {
  nome_salone: 'Parrucchieri Larosa',
  slogan: 'Il tuo aspetto è la miglior pubblicità del nostro successo.',
  partita_iva: '13160320019',
  conferma_automatica: '0',
  anticipo_minimo_ore: '2',
  giorni_prenotabili: '60',
  intervallo_slot: '15',
  annullamento_ore: '12',
  instagram: '',
  facebook: '',
  messaggio_conferma: 'Ciao {nome}! La tua prenotazione da Parrucchieri Larosa per {data} alle {ora} in {sede} è confermata. Codice {codice}. A presto!',
  messaggio_rifiuto: 'Ciao {nome}, purtroppo per {data} alle {ora} non riusciamo a riceverti. Scrivici o chiamaci per trovare un altro orario!',
};

export function getSetting(k) {
  const r = db.prepare('SELECT valore FROM impostazioni WHERE chiave = ?').get(k);
  return r ? r.valore : DEFAULTS[k];
}
export function setSetting(k, v) {
  db.prepare('INSERT INTO impostazioni (chiave, valore) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore').run(k, v == null ? null : String(v));
}
export function allSettings() {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT chiave, valore FROM impostazioni').all()) out[r.chiave] = r.valore;
  delete out.secret; delete out.vapid_public; delete out.vapid_private;
  return out;
}

if (!getSetting('secret')) setSetting('secret', crypto.randomBytes(48).toString('hex'));

const vuoto = db.prepare('SELECT COUNT(*) AS n FROM sedi').get().n === 0;
if (vuoto) seed(db);

export const J = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };

export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
