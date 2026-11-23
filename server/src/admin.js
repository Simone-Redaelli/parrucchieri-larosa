import { Router } from 'express';
import { db, J, getSetting, setSetting, allSettings } from './db.js';
import { adesso, addGiorni, isData, fmt, giornoSett } from './tempo.js';
import { hashPassword, verificaPassword, firmaToken, richiediLogin, soloTitolare } from './auth.js';
import { sse, chiavePush, emetti } from './eventi.js';
import { slotLiberi, durataServizi, turni } from './disponibilita.js';
import { creaPrenotazione, aggiornaPrenotazione, dettaglio, messaggioWhatsApp, normTel, ErroreUtente } from './prenotazioni.js';

const r = Router();

r.get('/stato', (req, res) => {
  res.json({ configurato: db.prepare('SELECT COUNT(*) AS n FROM utenti').get().n > 0, nome: getSetting('nome_salone') });
});

r.post('/setup', (req, res) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM utenti').get().n > 0) throw new ErroreUtente('Il gestionale è già configurato.', 403);
  const { nome, email, password } = req.body || {};
  if (!nome || !email || String(password || '').length < 8) throw new ErroreUtente('Nome, email e password di almeno 8 caratteri.');
  const id = db.prepare('INSERT INTO utenti (nome, email, hash, ruolo) VALUES (?,?,?,?)').run(nome, String(email).toLowerCase().trim(), hashPassword(password), 'titolare').lastInsertRowid;
  const u = db.prepare('SELECT id, nome, email, ruolo, staff_id FROM utenti WHERE id = ?').get(id);
  res.json({ token: firmaToken(u), utente: u });
});

const tentativi = new Map();
r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const k = req.ip;
  const t = (tentativi.get(k) || []).filter(x => Date.now() - x < 15 * 60e3);
  if (t.length >= 10) throw new ErroreUtente('Troppi tentativi. Riprova tra 15 minuti.', 429);
  const u = db.prepare('SELECT * FROM utenti WHERE email = ?').get(String(email || '').toLowerCase().trim());
  if (!u || !verificaPassword(String(password || ''), u.hash)) {
    t.push(Date.now()); tentativi.set(k, t);
    throw new ErroreUtente('Email o password sbagliati.', 401);
  }
  const { hash, ...pub } = u;
  res.json({ token: firmaToken(u), utente: pub });
});

r.use(richiediLogin);

r.get('/me', (req, res) => res.json(req.utente));
r.get('/eventi', sse);

r.post('/password', (req, res) => {
  const { attuale, nuova } = req.body || {};
  const u = db.prepare('SELECT hash FROM utenti WHERE id = ?').get(req.utente.id);
  if (!verificaPassword(String(attuale || ''), u.hash)) throw new ErroreUtente('La password attuale non è corretta.');
  if (String(nuova || '').length < 8) throw new ErroreUtente('La nuova password deve avere almeno 8 caratteri.');
  db.prepare('UPDATE utenti SET hash = ? WHERE id = ?').run(hashPassword(nuova), req.utente.id);
  res.json({ ok: true });
});

const STATI_VALIDI = "p.stato IN ('in_attesa','confermata','completata')";
const incasso = "COALESCE(p.prezzo_finale, p.prezzo_stimato, 0)";

r.get('/dashboard', (req, res) => {
  const ora = adesso();
  const oggi = isData(req.query.data) ? req.query.data : ora.data;
  const lun = addGiorni(oggi, -((giornoSett(oggi) + 6) % 7));
  const inizioMese = oggi.slice(0, 8) + '01';
  const da30 = addGiorni(oggi, -29);

  const lista = (where, ...args) => db.prepare(`SELECT p.id FROM prenotazioni p WHERE ${where} ORDER BY p.data, p.inizio`).all(...args).map(x => dettaglio(x.id));
  const conta = (where, ...args) => db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(${incasso}),0) AS e FROM prenotazioni p WHERE ${where}`).get(...args);

  const appOggi = lista(`p.data = ? AND p.stato NOT IN ('cancellata','rifiutata')`, oggi);
  const inAttesa = lista(`p.stato = 'in_attesa' AND p.data >= ?`, ora.data);

  let minutiDisp = 0;
  const sedi = db.prepare('SELECT * FROM sedi WHERE attiva = 1').all();
  for (const sede of sedi) for (const s of db.prepare('SELECT * FROM staff WHERE attivo = 1 AND sede_id = ?').all(sede.id))
    for (const [a, b] of turni(s, sede, oggi)) minutiDisp += b - a;
  const minutiOcc = appOggi.filter(p => p.stato !== 'no_show').reduce((t, p) => t + p.durata, 0);

  const andamento = [];
  for (let i = 0; i < 30; i++) {
    const d = addGiorni(da30, i);
    const x = conta(`p.data = ? AND ${STATI_VALIDI}`, d);
    andamento.push({ data: d, n: x.n, incasso: x.e });
  }
  const topServizi = {};
  for (const row of db.prepare(`SELECT p.servizi FROM prenotazioni p WHERE p.data BETWEEN ? AND ? AND ${STATI_VALIDI}`).all(da30, oggi))
    for (const s of J(row.servizi, [])) {
      topServizi[s.nome] ??= { nome: s.nome, n: 0, incasso: 0 };
      topServizi[s.nome].n++; topServizi[s.nome].incasso += s.prezzo || 0;
    }
  const perStaff = db.prepare(`SELECT st.id, st.nome, st.colore, COUNT(p.id) AS n, COALESCE(SUM(${incasso}),0) AS incasso
    FROM staff st LEFT JOIN prenotazioni p ON p.staff_id = st.id AND p.data BETWEEN ? AND ? AND ${STATI_VALIDI}
    WHERE st.attivo = 1 GROUP BY st.id ORDER BY incasso DESC`).all(da30, oggi);
  const origine = db.prepare(`SELECT origine, COUNT(*) AS n FROM prenotazioni p WHERE p.data BETWEEN ? AND ? AND ${STATI_VALIDI} GROUP BY origine`).all(da30, oggi);

  const settimana = conta(`p.data BETWEEN ? AND ? AND ${STATI_VALIDI}`, lun, addGiorni(lun, 6));
  const mese = conta(`p.data BETWEEN ? AND ? AND ${STATI_VALIDI}`, inizioMese, oggi.slice(0, 8) + '31');
  const incassoOggi = conta(`p.data = ? AND p.stato = 'completata'`, oggi).e;
  const nuoviClienti = db.prepare(`SELECT COUNT(*) AS n FROM clienti WHERE creato_il >= ?`).get(inizioMese).n;
  const noShow = db.prepare(`SELECT COUNT(*) AS n FROM prenotazioni WHERE stato = 'no_show' AND data BETWEEN ? AND ?`).get(da30, oggi).n;

  res.json({
    oggi, ora: fmt(ora.min), appuntamenti: appOggi, in_attesa: inAttesa,
    kpi: {
      oggi: appOggi.length, settimana: settimana.n, mese: mese.n, incasso_oggi: incassoOggi, incasso_mese: mese.e,
      nuovi_clienti: nuoviClienti, occupazione: minutiDisp ? Math.round(minutiOcc / minutiDisp * 100) : 0, no_show_30: noShow,
    },
    andamento, top_servizi: Object.values(topServizi).sort((a, b) => b.n - a.n).slice(0, 6), staff: perStaff, origine,
  });
});

r.get('/prenotazioni', (req, res) => {
  const w = ['1=1']; const a = [];
  if (isData(req.query.dal)) { w.push('p.data >= ?'); a.push(req.query.dal); }
  if (isData(req.query.al)) { w.push('p.data <= ?'); a.push(req.query.al); }
  if (req.query.sede) { w.push('p.sede_id = ?'); a.push(Number(req.query.sede)); }
  if (req.query.staff) { w.push('p.staff_id = ?'); a.push(Number(req.query.staff)); }
  if (req.query.cliente) { w.push('p.cliente_id = ?'); a.push(Number(req.query.cliente)); }
  if (req.query.stato) { const st = String(req.query.stato).split(','); w.push(`p.stato IN (${st.map(() => '?').join(',')})`); a.push(...st); }
  if (req.query.q) {
    const q = `%${String(req.query.q).toLowerCase()}%`;
    w.push(`(lower(c.nome || ' ' || COALESCE(c.cognome,'')) LIKE ? OR c.telefono LIKE ? OR lower(p.codice) LIKE ? OR lower(p.servizi) LIKE ?)`); a.push(q, q, q, q);
  }
  const ordine = req.query.ordine === 'recenti' ? 'p.creata_il DESC' : (req.query.ordine === 'desc' ? 'p.data DESC, p.inizio DESC' : 'p.data, p.inizio');
  const lim = Math.min(Number(req.query.limite) || 500, 2000);
  const ids = db.prepare(`SELECT p.id FROM prenotazioni p LEFT JOIN clienti c ON c.id = p.cliente_id WHERE ${w.join(' AND ')} ORDER BY ${ordine} LIMIT ${lim}`).all(...a);
  res.json(ids.map(x => dettaglio(x.id)));
});

r.get('/prenotazioni/:id', (req, res) => {
  const p = dettaglio(Number(req.params.id));
  if (!p) throw new ErroreUtente('Prenotazione non trovata.', 404);
  res.json({ ...p, whatsapp_conferma: messaggioWhatsApp(p, 'conferma'), whatsapp_rifiuto: messaggioWhatsApp(p, 'rifiuto') });
});

r.post('/prenotazioni', (req, res) => {
  const b = req.body || {};
  if (!isData(b.data) || !/^\d{2}:\d{2}$/.test(String(b.ora))) throw new ErroreUtente('Data o orario non validi.');
  res.status(201).json(creaPrenotazione(b, { admin: true, utente: req.utente }));
});

r.patch('/prenotazioni/:id', (req, res) => res.json(aggiornaPrenotazione(Number(req.params.id), req.body || {}, req.utente)));

r.delete('/prenotazioni/:id', (req, res) => {
  db.prepare('DELETE FROM prenotazioni WHERE id = ?').run(Number(req.params.id));
  emetti('prenotazione', { tipo: 'eliminata', id: Number(req.params.id), da: req.utente.nome });
  res.json({ ok: true });
});

r.get('/slot', (req, res) => {
  const servizioIds = String(req.query.servizi || '').split(',').map(Number).filter(Boolean);
  const durata = Number(req.query.durata) || durataServizi(servizioIds).durata;
  if (!isData(req.query.data) || !durata) return res.json([]);
  res.json(slotLiberi({ sedeId: Number(req.query.sede), data: req.query.data, durata, staffId: req.query.staff ? Number(req.query.staff) : null, servizioIds, admin: true, escludiId: Number(req.query.escludi) || 0 }));
});

r.get('/agenda', (req, res) => {
  const dal = isData(req.query.dal) ? req.query.dal : adesso().data;
  const al = isData(req.query.al) ? req.query.al : dal;
  const sedi = db.prepare('SELECT * FROM sedi WHERE attiva = 1 ORDER BY ordine, id').all();
  const staff = db.prepare('SELECT * FROM staff WHERE attivo = 1 ORDER BY ordine, id').all();
  const giorni = [];
  for (let d = dal; d <= al; d = addGiorni(d, 1)) {
    giorni.push({
      data: d,
      turni: Object.fromEntries(staff.map(s => [s.id, turni(s, sedi.find(x => x.id === s.sede_id), d).map(([a, b]) => [a, b])])),
    });
    if (giorni.length > 42) break;
  }
  const ids = db.prepare(`SELECT id FROM prenotazioni WHERE data BETWEEN ? AND ? AND stato NOT IN ('rifiutata') ORDER BY data, inizio`).all(dal, al);
  res.json({ giorni, prenotazioni: ids.map(x => dettaglio(x.id)) });
});

r.get('/clienti', (req, res) => {
  const q = req.query.q ? `%${String(req.query.q).toLowerCase()}%` : null;
  const rows = db.prepare(`SELECT c.*, COUNT(p.id) AS visite, MAX(CASE WHEN p.stato = 'completata' THEN p.data END) AS ultima_visita,
      MIN(CASE WHEN p.data >= ? AND p.stato IN ('in_attesa','confermata') THEN p.data END) AS prossima,
      COALESCE(SUM(CASE WHEN p.stato = 'completata' THEN COALESCE(p.prezzo_finale, p.prezzo_stimato, 0) END), 0) AS speso,
      SUM(CASE WHEN p.stato = 'no_show' THEN 1 ELSE 0 END) AS no_show
    FROM clienti c LEFT JOIN prenotazioni p ON p.cliente_id = c.id
    ${q ? "WHERE lower(c.nome || ' ' || COALESCE(c.cognome,'')) LIKE ? OR c.telefono LIKE ? OR lower(COALESCE(c.email,'')) LIKE ?" : ''}
    GROUP BY c.id ORDER BY ${req.query.ordine === 'speso' ? 'speso DESC' : req.query.ordine === 'recenti' ? 'c.creato_il DESC' : 'lower(c.nome), lower(c.cognome)'} LIMIT 1000`)
    .all(adesso().data, ...(q ? [q, q, q] : []));
  res.json(rows);
});

r.get('/clienti/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM clienti WHERE id = ?').get(Number(req.params.id));
  if (!c) throw new ErroreUtente('Cliente non trovato.', 404);
  const storico = db.prepare('SELECT id FROM prenotazioni WHERE cliente_id = ? ORDER BY data DESC, inizio DESC').all(c.id).map(x => dettaglio(x.id));
  res.json({ ...c, storico });
});

function datiCliente(b) {
  return [String(b.nome || '').trim(), b.cognome || null, b.telefono ? normTel(b.telefono) : null, b.email || null, b.note || null, b.compleanno || null, b.marketing ? 1 : 0];
}
r.post('/clienti', (req, res) => {
  const d = datiCliente(req.body || {});
  if (!d[0]) throw new ErroreUtente('Il nome è obbligatorio.');
  if (d[2] && db.prepare('SELECT 1 FROM clienti WHERE telefono = ?').get(d[2])) throw new ErroreUtente('Esiste già un cliente con questo telefono.');
  const id = db.prepare('INSERT INTO clienti (nome, cognome, telefono, email, note, compleanno, marketing) VALUES (?,?,?,?,?,?,?)').run(...d).lastInsertRowid;
  res.status(201).json(db.prepare('SELECT * FROM clienti WHERE id = ?').get(id));
});
r.patch('/clienti/:id', (req, res) => {
  const d = datiCliente(req.body || {});
  if (!d[0]) throw new ErroreUtente('Il nome è obbligatorio.');
  try { db.prepare('UPDATE clienti SET nome=?, cognome=?, telefono=?, email=?, note=?, compleanno=?, marketing=? WHERE id = ?').run(...d, Number(req.params.id)); }
  catch { throw new ErroreUtente('Esiste già un cliente con questo telefono.'); }
  res.json(db.prepare('SELECT * FROM clienti WHERE id = ?').get(Number(req.params.id)));
});
r.delete('/clienti/:id', soloTitolare, (req, res) => {
  db.prepare('DELETE FROM clienti WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

function crud(nome, tabella, campi, json = []) {
  const prep = b => campi.map(c => {
    const v = b[c];
    if (json.includes(c)) return v == null ? null : JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v === '' ? null : v ?? null;
  });
  const fuori = row => { const o = { ...row }; for (const c of json) o[c] = J(o[c]); return o; };
  r.get(`/${nome}`, (req, res) => res.json(db.prepare(`SELECT * FROM ${tabella} ORDER BY ${campi.includes('ordine') ? 'ordine, ' : ''}id`).all().map(fuori)));
  r.post(`/${nome}`, soloTitolare, (req, res) => {
    const b = req.body || {};
    const id = db.prepare(`INSERT INTO ${tabella} (${campi.join(',')}) VALUES (${campi.map(() => '?').join(',')})`).run(...prep(b)).lastInsertRowid;
    emetti('config', { nome });
    res.status(201).json(fuori(db.prepare(`SELECT * FROM ${tabella} WHERE id = ?`).get(id)));
  });
  r.patch(`/${nome}/:id`, soloTitolare, (req, res) => {
    const b = req.body || {};
    const presenti = campi.filter(c => c in b);
    if (presenti.length) {
      const vals = prep(b).filter((_, i) => campi[i] in b);
      db.prepare(`UPDATE ${tabella} SET ${presenti.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...vals, Number(req.params.id));
    }
    emetti('config', { nome });
    res.json(fuori(db.prepare(`SELECT * FROM ${tabella} WHERE id = ?`).get(Number(req.params.id))));
  });
  r.delete(`/${nome}/:id`, soloTitolare, (req, res) => {
    db.prepare(`DELETE FROM ${tabella} WHERE id = ?`).run(Number(req.params.id));
    emetti('config', { nome });
    res.json({ ok: true });
  });
}

crud('servizi', 'servizi', ['nome', 'categoria', 'descrizione', 'durata', 'prezzo', 'prezzo_max', 'tipo_prezzo', 'online', 'attivo', 'ordine']);
crud('staff', 'staff', ['nome', 'ruolo', 'bio', 'sede_id', 'colore', 'orari', 'servizi', 'prenotabile', 'attivo', 'ordine'], ['orari', 'servizi']);
crud('sedi', 'sedi', ['nome', 'indirizzo', 'cap', 'citta', 'telefono', 'telefono2', 'whatsapp', 'email', 'orari', 'attiva', 'ordine'], ['orari']);
crud('chiusure', 'chiusure', ['sede_id', 'staff_id', 'dal', 'al', 'motivo']);

r.get('/impostazioni', (req, res) => res.json(allSettings()));
r.patch('/impostazioni', soloTitolare, (req, res) => {
  const vietate = ['secret', 'vapid_public', 'vapid_private'];
  for (const [k, v] of Object.entries(req.body || {})) if (!vietate.includes(k)) setSetting(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
  emetti('config', { nome: 'impostazioni' });
  res.json(allSettings());
});

r.get('/utenti', soloTitolare, (req, res) => res.json(db.prepare('SELECT id, nome, email, ruolo, staff_id, creato_il FROM utenti ORDER BY id').all()));
r.post('/utenti', soloTitolare, (req, res) => {
  const { nome, email, password, ruolo, staff_id } = req.body || {};
  if (!nome || !email || String(password || '').length < 8) throw new ErroreUtente('Nome, email e password di almeno 8 caratteri.');
  try {
    const id = db.prepare('INSERT INTO utenti (nome, email, hash, ruolo, staff_id) VALUES (?,?,?,?,?)').run(nome, String(email).toLowerCase().trim(), hashPassword(password), ruolo === 'titolare' ? 'titolare' : 'staff', staff_id || null).lastInsertRowid;
    res.status(201).json(db.prepare('SELECT id, nome, email, ruolo, staff_id, creato_il FROM utenti WHERE id = ?').get(id));
  } catch { throw new ErroreUtente('Esiste già un utente con questa email.'); }
});
r.patch('/utenti/:id', soloTitolare, (req, res) => {
  const id = Number(req.params.id);
  const { nome, ruolo, staff_id, password } = req.body || {};
  if (id === req.utente.id && ruolo && ruolo !== 'titolare') throw new ErroreUtente('Non puoi togliere a te stesso il ruolo di titolare.');
  if (nome) db.prepare('UPDATE utenti SET nome = ? WHERE id = ?').run(nome, id);
  if (ruolo) db.prepare('UPDATE utenti SET ruolo = ? WHERE id = ?').run(ruolo === 'titolare' ? 'titolare' : 'staff', id);
  if (staff_id !== undefined) db.prepare('UPDATE utenti SET staff_id = ? WHERE id = ?').run(staff_id || null, id);
  if (password) {
    if (String(password).length < 8) throw new ErroreUtente('Password di almeno 8 caratteri.');
    db.prepare('UPDATE utenti SET hash = ? WHERE id = ?').run(hashPassword(password), id);
  }
  res.json(db.prepare('SELECT id, nome, email, ruolo, staff_id, creato_il FROM utenti WHERE id = ?').get(id));
});
r.delete('/utenti/:id', soloTitolare, (req, res) => {
  if (Number(req.params.id) === req.utente.id) throw new ErroreUtente('Non puoi eliminare il tuo account.');
  db.prepare('DELETE FROM utenti WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

r.get('/push/chiave', (req, res) => res.json({ chiave: chiavePush() }));
r.post('/push', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) throw new ErroreUtente('Iscrizione non valida.');
  db.prepare('INSERT INTO push (utente_id, endpoint, dati) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET dati = excluded.dati, utente_id = excluded.utente_id')
    .run(req.utente.id, sub.endpoint, JSON.stringify(sub));
  res.json({ ok: true });
});
r.delete('/push', (req, res) => {
  db.prepare('DELETE FROM push WHERE endpoint = ?').run(String(req.body?.endpoint || ''));
  res.json({ ok: true });
});

r.get('/esporta/clienti.csv', (req, res) => {
  const rows = db.prepare('SELECT nome, cognome, telefono, email, compleanno, marketing, note, creato_il FROM clienti ORDER BY nome').all();
  const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = ['Nome;Cognome;Telefono;Email;Compleanno;Marketing;Note;Creato il', ...rows.map(r => [r.nome, r.cognome, r.telefono, r.email, r.compleanno, r.marketing ? 'sì' : 'no', r.note, r.creato_il].map(esc).join(';'))].join('\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clienti-larosa.csv"' }).send('﻿' + csv);
});

export default r;
