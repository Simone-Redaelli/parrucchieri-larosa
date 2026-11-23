import crypto from 'node:crypto';
import { db, J, tx, getSetting } from './db.js';
import { fmt, hm, dataEstesa } from './tempo.js';
import { slotLiberi, staffIdonei, durataServizi, scegliStaff, libero, turni } from './disponibilita.js';
import { emetti, inviaPush } from './eventi.js';

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function nuovoCodice() {
  for (;;) {
    const b = crypto.randomBytes(8);
    let c = 'LR-';
    for (let i = 0; i < 8; i++) c += ALFA[b[i] % ALFA.length];
    if (!db.prepare('SELECT 1 FROM prenotazioni WHERE codice = ?').get(c)) return c;
  }
}

export const normTel = t => {
  let s = String(t || '').replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s && !s.startsWith('+')) s = '+39' + s;
  return s;
};

export function trovaOCreaCliente({ nome, cognome, telefono, email, marketing }) {
  const tel = normTel(telefono);
  let c = tel ? db.prepare('SELECT * FROM clienti WHERE telefono = ?').get(tel) : null;
  if (c) {
    db.prepare('UPDATE clienti SET nome = COALESCE(NULLIF(?, \'\'), nome), cognome = COALESCE(NULLIF(?, \'\'), cognome), email = COALESCE(NULLIF(?, \'\'), email), marketing = MAX(marketing, ?) WHERE id = ?')
      .run(nome || '', cognome || '', email || '', marketing ? 1 : 0, c.id);
    return c.id;
  }
  return Number(db.prepare('INSERT INTO clienti (nome, cognome, telefono, email, marketing) VALUES (?,?,?,?,?)')
    .run(nome, cognome || null, tel || null, email || null, marketing ? 1 : 0).lastInsertRowid);
}

export function stimaPrezzo(servizi) {
  return servizi.reduce((t, s) => t + (s.prezzo || 0), 0);
}

export function dettaglio(id) {
  const p = db.prepare(`SELECT p.*, c.nome AS cliente_nome, c.cognome AS cliente_cognome, c.telefono AS cliente_telefono, c.email AS cliente_email,
      s.nome AS sede_nome, s.indirizzo AS sede_indirizzo, s.telefono AS sede_telefono, s.whatsapp AS sede_whatsapp,
      st.nome AS staff_nome, st.colore AS staff_colore
    FROM prenotazioni p
    LEFT JOIN clienti c ON c.id = p.cliente_id
    LEFT JOIN sedi s ON s.id = p.sede_id
    LEFT JOIN staff st ON st.id = p.staff_id
    WHERE p.id = ?`).get(id);
  if (!p) return null;
  return { ...p, servizi: J(p.servizi, []), ora: fmt(p.inizio), ora_fine: fmt(p.fine), durata: p.fine - p.inizio };
}

export function pubblica(p) {
  return {
    codice: p.codice, stato: p.stato, data: p.data, ora: p.ora, ora_fine: p.ora_fine, durata: p.durata,
    data_estesa: dataEstesa(p.data), servizi: p.servizi.map(s => ({ nome: s.nome, durata: s.durata, prezzo: s.prezzo, tipo_prezzo: s.tipo_prezzo })),
    prezzo_stimato: p.prezzo_stimato, nome: p.cliente_nome, sede: { nome: p.sede_nome, indirizzo: p.sede_indirizzo, telefono: p.sede_telefono, whatsapp: p.sede_whatsapp },
    staff: p.staff_nome, note: p.note_cliente,
    annullabile: annullabile(p),
  };
}

export function annullabile(p) {
  if (!['in_attesa', 'confermata'].includes(p.stato)) return false;
  const ore = Number(getSetting('annullamento_ore')) || 0;
  const quando = new Date(`${p.data}T${fmt(p.inizio)}:00`);
  const ora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return quando - ora > ore * 3600e3;
}

export class ErroreUtente extends Error { constructor(m, code = 400) { super(m); this.code = code; } }

export function creaPrenotazione(input, { admin = false, utente = null } = {}) {
  const servizioIds = (input.servizi || []).map(Number).filter(Boolean);
  if (!servizioIds.length) throw new ErroreUtente('Scegli almeno un servizio.');
  const { durata: durataCalc, servizi } = durataServizi(servizioIds);
  if (servizi.length !== servizioIds.length) throw new ErroreUtente('Uno dei servizi non è più disponibile.');
  if (!admin && servizi.some(s => !s.online)) throw new ErroreUtente('Uno dei servizi va prenotato telefonicamente.');
  const durata = admin && input.durata ? Number(input.durata) : durataCalc;
  const sedeId = Number(input.sede_id);
  const data = String(input.data);
  const inizio = hm(input.ora);
  const fine = inizio + durata;
  if (!input.cliente_id && !input.nome?.trim()) throw new ErroreUtente('Inserisci il nome.');
  if (!admin && normTel(input.telefono).length < 9) throw new ErroreUtente('Inserisci un numero di telefono valido.');

  const id = tx(() => {
    let staffId = input.staff_id ? Number(input.staff_id) : null;
    if (admin && input.forza) {
      if (!staffId) staffId = staffIdonei({ sedeId, servizioIds, soloOnline: false })[0]?.id;
      if (!staffId) throw new ErroreUtente('Scegli lo stylist.');
    } else {
      const slot = slotLiberi({ sedeId, data, durata, staffId, servizioIds, admin }).find(s => s.min === inizio);
      if (!slot) throw new ErroreUtente('Questo orario è appena stato preso. Scegline un altro.', 409);
      staffId = staffId || scegliStaff(slot.staff, data);
      if (!libero(staffId, data, inizio, fine)) throw new ErroreUtente('Questo orario è appena stato preso. Scegline un altro.', 409);
    }
    const clienteId = input.cliente_id ? Number(input.cliente_id) : trovaOCreaCliente(input);
    const auto = getSetting('conferma_automatica') === '1';
    const stato = admin ? (input.stato || 'confermata') : (auto ? 'confermata' : 'in_attesa');
    const snap = servizi.map(s => ({ id: s.id, nome: s.nome, durata: s.durata, prezzo: s.prezzo, prezzo_max: s.prezzo_max, tipo_prezzo: s.tipo_prezzo }));
    return Number(db.prepare(`INSERT INTO prenotazioni (codice, cliente_id, sede_id, staff_id, data, inizio, fine, servizi, prezzo_stimato, stato, origine, note_cliente, note_interne)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      nuovoCodice(), clienteId, sedeId, staffId, data, inizio, fine, JSON.stringify(snap), stimaPrezzo(snap), stato,
      admin ? (input.origine || 'gestionale') : 'online', admin ? null : (input.note || null), admin ? (input.note_interne || null) : null,
    ).lastInsertRowid);
  });

  const p = dettaglio(id);
  emetti('prenotazione', { tipo: 'nuova', prenotazione: p, da: utente?.nome || null });
  if (!admin) {
    inviaPush({
      title: p.stato === 'in_attesa' ? 'Nuova richiesta di prenotazione' : 'Nuova prenotazione',
      body: `${p.cliente_nome}${p.cliente_cognome ? ' ' + p.cliente_cognome : ''} · ${dataEstesa(p.data)} ore ${p.ora} · ${p.servizi.map(s => s.nome).join(', ')}`,
      tag: p.codice, url: `/gestionale/#/prenotazioni/${p.id}`,
    }).catch(() => {});
  }
  return p;
}

export function aggiornaPrenotazione(id, patch, utente) {
  const vecchia = dettaglio(id);
  if (!vecchia) throw new ErroreUtente('Prenotazione non trovata.', 404);
  const campi = {};
  if (patch.stato) campi.stato = patch.stato;
  if ('note_interne' in patch) campi.note_interne = patch.note_interne || null;
  if ('prezzo_finale' in patch) campi.prezzo_finale = patch.prezzo_finale === '' || patch.prezzo_finale == null ? null : Number(patch.prezzo_finale);

  let servizi = vecchia.servizi;
  if (Array.isArray(patch.servizi)) {
    const r = durataServizi(patch.servizi.map(Number));
    servizi = r.servizi.map(s => ({ id: s.id, nome: s.nome, durata: s.durata, prezzo: s.prezzo, prezzo_max: s.prezzo_max, tipo_prezzo: s.tipo_prezzo }));
    campi.servizi = JSON.stringify(servizi);
    campi.prezzo_stimato = stimaPrezzo(servizi);
  }
  const spostata = patch.data || patch.ora || patch.staff_id || patch.durata || Array.isArray(patch.servizi) || patch.sede_id;
  if (spostata) {
    const data = patch.data || vecchia.data;
    const inizio = patch.ora ? hm(patch.ora) : vecchia.inizio;
    const durata = patch.durata ? Number(patch.durata) : (Array.isArray(patch.servizi) ? servizi.reduce((t, s) => t + s.durata, 0) : vecchia.durata);
    const staffId = patch.staff_id ? Number(patch.staff_id) : vecchia.staff_id;
    if (!patch.forza && staffId && !libero(staffId, data, inizio, inizio + durata, id)) throw new ErroreUtente('In quell\'orario l\'operatore ha già un appuntamento.', 409);
    Object.assign(campi, { data, inizio, fine: inizio + durata, staff_id: staffId });
    if (patch.sede_id) campi.sede_id = Number(patch.sede_id);
  }
  if (!Object.keys(campi).length) return vecchia;
  const set = Object.keys(campi).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE prenotazioni SET ${set}, aggiornata_il = datetime('now') WHERE id = ?`).run(...Object.values(campi), id);
  const p = dettaglio(id);
  emetti('prenotazione', { tipo: 'aggiornata', prenotazione: p, da: utente?.nome || 'cliente' });
  return p;
}

export function messaggioWhatsApp(p, tipo) {
  const tpl = getSetting(tipo === 'rifiuto' ? 'messaggio_rifiuto' : 'messaggio_conferma') || '';
  return tpl.replaceAll('{nome}', p.cliente_nome || '').replaceAll('{data}', dataEstesa(p.data)).replaceAll('{ora}', p.ora)
    .replaceAll('{sede}', `${p.sede_nome} (${p.sede_indirizzo})`).replaceAll('{codice}', p.codice)
    .replaceAll('{servizi}', p.servizi.map(s => s.nome).join(', '));
}

export function ics(p) {
  const d = p.data.replaceAll('-', '');
  const t = x => x.replace(':', '') + '00';
  const esc = s => String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Parrucchieri Larosa//Prenotazioni//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
    'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${p.codice}@parrucchierilarosa.it`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Rome:${d}T${t(p.ora)}`, `DTEND;TZID=Europe/Rome:${d}T${t(p.ora_fine)}`,
    `SUMMARY:${esc('Parrucchieri Larosa · ' + p.servizi.map(s => s.nome).join(', '))}`,
    `LOCATION:${esc(`${p.sede_indirizzo}, Torino`)}`,
    `DESCRIPTION:${esc(`Codice prenotazione ${p.codice}. Per modifiche chiama ${p.sede_telefono}.`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Appuntamento da Larosa', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export { turni };
