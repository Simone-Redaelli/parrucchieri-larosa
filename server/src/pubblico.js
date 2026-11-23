import { Router } from 'express';
import { db, J, getSetting } from './db.js';
import { isData } from './tempo.js';
import { slotLiberi, giorniDisponibili, durataServizi } from './disponibilita.js';
import { creaPrenotazione, dettaglio, pubblica, annullabile, aggiornaPrenotazione, ics, ErroreUtente } from './prenotazioni.js';

const r = Router();

const limiti = new Map();
function limite(max, finestraMin) {
  return (req, res, next) => {
    const k = `${req.ip}:${req.path}`;
    const ora = Date.now();
    const lista = (limiti.get(k) || []).filter(t => ora - t < finestraMin * 60e3);
    if (lista.length >= max) return res.status(429).json({ errore: 'Troppe richieste, riprova tra poco.' });
    lista.push(ora); limiti.set(k, lista); next();
  };
}

r.get('/info', (req, res) => {
  const sedi = db.prepare('SELECT id, nome, indirizzo, cap, citta, telefono, telefono2, whatsapp, email, orari FROM sedi WHERE attiva = 1 ORDER BY ordine, id').all()
    .map(s => ({ ...s, orari: J(s.orari, {}) }));
  const staff = db.prepare('SELECT id, nome, ruolo, bio, sede_id, colore, servizi FROM staff WHERE attivo = 1 AND prenotabile = 1 ORDER BY ordine, id').all()
    .map(s => ({ ...s, servizi: J(s.servizi) }));
  const servizi = db.prepare('SELECT id, nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo, online FROM servizi WHERE attivo = 1 ORDER BY ordine, id').all();
  res.json({
    salone: {
      nome: getSetting('nome_salone'), slogan: getSetting('slogan'), partita_iva: getSetting('partita_iva'),
      instagram: getSetting('instagram'), facebook: getSetting('facebook'),
      giorni_prenotabili: Number(getSetting('giorni_prenotabili')), conferma_automatica: getSetting('conferma_automatica') === '1',
      annullamento_ore: Number(getSetting('annullamento_ore')),
    },
    sedi, staff, servizi,
  });
});

function parametri(q) {
  const servizioIds = String(q.servizi || '').split(',').map(Number).filter(Boolean);
  const { durata } = durataServizi(servizioIds);
  return { sedeId: Number(q.sede), staffId: q.staff ? Number(q.staff) : null, servizioIds, durata };
}

r.get('/giorni', (req, res) => {
  const p = parametri(req.query);
  if (!/^\d{4}-\d{2}$/.test(String(req.query.mese)) || !p.sedeId || !p.durata) return res.status(400).json({ errore: 'Parametri mancanti' });
  res.json(giorniDisponibili({ ...p, mese: req.query.mese }));
});

r.get('/slot', (req, res) => {
  const p = parametri(req.query);
  if (!isData(req.query.data) || !p.sedeId || !p.durata) return res.status(400).json({ errore: 'Parametri mancanti' });
  res.json(slotLiberi({ ...p, data: req.query.data }).map(s => ({ ora: s.ora, min: s.min, staff: s.staff })));
});

r.post('/prenota', limite(8, 60), (req, res) => {
  const b = req.body || {};
  if (b.sito) return res.json({ ok: true });
  if (!isData(b.data) || !/^\d{2}:\d{2}$/.test(String(b.ora))) throw new ErroreUtente('Data o orario non validi.');
  const p = creaPrenotazione({
    servizi: b.servizi, sede_id: b.sede_id, staff_id: b.staff_id || null, data: b.data, ora: b.ora,
    nome: String(b.nome || '').trim().slice(0, 60), cognome: String(b.cognome || '').trim().slice(0, 60),
    telefono: String(b.telefono || '').slice(0, 25), email: String(b.email || '').trim().slice(0, 120),
    note: String(b.note || '').trim().slice(0, 500), marketing: !!b.marketing,
  });
  res.status(201).json(pubblica(p));
});

function perCodice(codice) {
  const row = db.prepare('SELECT id FROM prenotazioni WHERE codice = ?').get(String(codice).toUpperCase());
  if (!row) throw new ErroreUtente('Prenotazione non trovata. Controlla il codice.', 404);
  return dettaglio(row.id);
}

r.get('/prenotazione/:codice', limite(30, 10), (req, res) => res.json(pubblica(perCodice(req.params.codice))));

r.post('/prenotazione/:codice/annulla', limite(5, 10), (req, res) => {
  const p = perCodice(req.params.codice);
  if (!annullabile(p)) throw new ErroreUtente(`Non è più possibile annullare online. Chiama il salone al ${p.sede_telefono}.`);
  res.json(pubblica(aggiornaPrenotazione(p.id, { stato: 'cancellata', note_interne: [p.note_interne, 'Annullata dal cliente online'].filter(Boolean).join(' · ') })));
});

r.get('/prenotazione/:codice/calendario.ics', (req, res) => {
  const p = perCodice(req.params.codice);
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="larosa-${p.codice}.ics"` });
  res.send(ics(p));
});

export default r;
