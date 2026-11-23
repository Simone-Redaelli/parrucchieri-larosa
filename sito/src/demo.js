import { ORARI, SEDI, STAFF, SERVIZI, SALONE } from '../../condivisi/demo-dati.js';

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dataEstesa = d => { const x = new Date(d + 'T12:00:00'); return `${GIORNI[x.getDay()]} ${x.getDate()} ${MESI[x.getMonth()]}`; };

function leggi() { try { return JSON.parse(localStorage.getItem('larosa-demo') || '[]'); } catch { return []; } }
function scrivi(l) { try { localStorage.setItem('larosa-demo', JSON.stringify(l)); } catch {} }

function caso(seme) {
  let h = 2166136261;
  for (const c of seme) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

function agendaGestionale() {
  try {
    const g = JSON.parse(localStorage.getItem('larosa-gestionale-demo') || 'null');
    return g && g.creato === iso(new Date()) ? g : null;
  } catch { return null; }
}

function occupati(staffId, data) {
  const g = agendaGestionale();
  if (g) {
    const busy = g.prenotazioni.filter(p => p.staff_id === staffId && p.data === data && ['in_attesa', 'confermata', 'completata'].includes(p.stato));
    for (const p of leggi()) if (p.staff_id === staffId && p.data === data && ['in_attesa', 'confermata'].includes(p.stato) && !busy.some(x => x.codice === p.codice)) busy.push(p);
    return busy;
  }
  const r = caso(`${staffId}-${data}`);
  const busy = [];
  let t = 9 * 60 + Math.floor(r() * 4) * 15;
  while (t < 18 * 60) {
    const dur = [30, 45, 60, 90, 120][Math.floor(r() * 5)];
    if (r() < .55) busy.push({ inizio: t, fine: t + dur });
    t += dur + [0, 15, 30][Math.floor(r() * 3)];
  }
  for (const p of leggi()) if (p.staff_id === staffId && p.data === data && ['in_attesa', 'confermata'].includes(p.stato)) busy.push(p);
  return busy;
}

function slot({ sede, data, servizi, staff }) {
  const durata = servizi.reduce((t, id) => t + (SERVIZI.find(s => s.id === id)?.durata || 0), 0);
  if (!durata) return [];
  const ora = new Date();
  const oggi = iso(ora);
  const limite = iso(new Date(Date.now() + SALONE.giorni_prenotabili * 864e5));
  if (data < oggi || data > limite) return [];
  const minimo = data === oggi ? ora.getHours() * 60 + ora.getMinutes() + 120 : 0;
  const giorno = new Date(data + 'T12:00:00').getDay();
  const mappa = new Map();
  for (const s of STAFF.filter(x => x.sede_id === sede && (!staff || x.id === staff))) {
    const busy = occupati(s.id, data);
    for (const [a, b] of ORARI[giorno]) {
      for (let t = Math.ceil(Math.max(hm(a), minimo) / 15) * 15; t + durata <= hm(b); t += 15) {
        if (busy.some(x => t < x.fine && t + durata > x.inizio)) continue;
        if (!mappa.has(t)) mappa.set(t, []);
        mappa.get(t).push(s.id);
      }
    }
  }
  return [...mappa.entries()].sort((a, b) => a[0] - b[0]).map(([t, st]) => ({ ora: fmt(t), min: t, staff: st }));
}

function pubblica(p) {
  const sede = SEDI.find(s => s.id === p.sede_id);
  const quando = new Date(`${p.data}T${fmt(p.inizio)}:00`);
  return {
    codice: p.codice, stato: p.stato, data: p.data, ora: fmt(p.inizio), ora_fine: fmt(p.fine), durata: p.fine - p.inizio,
    data_estesa: dataEstesa(p.data), servizi: p.servizi, prezzo_stimato: p.servizi.reduce((t, s) => t + (s.prezzo || 0), 0),
    nome: p.nome, sede: { nome: sede.nome, indirizzo: sede.indirizzo, telefono: sede.telefono, whatsapp: sede.whatsapp },
    staff: STAFF.find(s => s.id === p.staff_id)?.nome, note: p.note,
    annullabile: ['in_attesa', 'confermata'].includes(p.stato) && quando - new Date() > SALONE.annullamento_ore * 3600e3,
  };
}

const errore = (msg, status = 400) => Object.assign(new Error(msg), { status });
const attesa = ms => new Promise(r => setTimeout(r, ms));

export async function demoApi(percorso, opzioni = {}) {
  await attesa(180 + Math.random() * 220);
  const [via, query = ''] = percorso.split('?');
  const q = Object.fromEntries(new URLSearchParams(query));
  const servizi = String(q.servizi || '').split(',').map(Number).filter(Boolean);
  const base = { sede: Number(q.sede), servizi, staff: q.staff ? Number(q.staff) : null };

  if (via === '/info') return { salone: SALONE, sedi: SEDI, staff: STAFF, servizi: SERVIZI };
  if (via === '/giorni') {
    const [y, m] = q.mese.split('-').map(Number);
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => { const data = `${q.mese}-${String(i + 1).padStart(2, '0')}`; return { data, slot: slot({ ...base, data }).length }; });
  }
  if (via === '/slot') return slot({ ...base, data: q.data });
  if (via === '/prenota') {
    const b = JSON.parse(opzioni.body || '{}');
    if (!b.nome?.trim()) throw errore('Inserisci il nome.');
    if (String(b.telefono || '').replace(/\D/g, '').length < 9) throw errore('Inserisci un numero di telefono valido.');
    const libero = slot({ sede: b.sede_id, data: b.data, servizi: b.servizi, staff: b.staff_id }).find(s => s.ora === b.ora);
    if (!libero) throw errore('Questo orario è appena stato preso. Scegline un altro.', 409);
    const scelti = b.servizi.map(id => SERVIZI.find(s => s.id === id));
    const durata = scelti.reduce((t, s) => t + s.durata, 0);
    const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const p = {
      codice: 'LR-' + Array.from({ length: 8 }, () => alfa[Math.floor(Math.random() * alfa.length)]).join(''),
      sede_id: b.sede_id, staff_id: b.staff_id || libero.staff[0], data: b.data, inizio: hm(b.ora), fine: hm(b.ora) + durata,
      servizi: scelti.map(s => ({ nome: s.nome, durata: s.durata, prezzo: s.prezzo, tipo_prezzo: s.tipo_prezzo })), stato: 'in_attesa', nome: b.nome, note: b.note,
    };
    scrivi([...leggi(), p]);
    try {
      const coda = JSON.parse(localStorage.getItem('larosa-demo-coda') || '[]');
      coda.push({ codice: p.codice, servizi: b.servizi, sede_id: b.sede_id, staff_id: p.staff_id, data: b.data, ora: b.ora, nome: b.nome, cognome: b.cognome, telefono: b.telefono, email: b.email, note: b.note });
      localStorage.setItem('larosa-demo-coda', JSON.stringify(coda.slice(-50)));
    } catch {}
    return pubblica(p);
  }
  const m = via.match(/^\/prenotazione\/([^/]+)(\/annulla)?$/);
  if (m) {
    const lista = leggi();
    const p = lista.find(x => x.codice === decodeURIComponent(m[1]).toUpperCase());
    if (!p) throw errore('Prenotazione non trovata. Controlla il codice.', 404);
    if (m[2]) { p.stato = 'cancellata'; scrivi(lista); }
    return pubblica(p);
  }
  throw errore('Percorso non trovato', 404);
}

export function demoIcs(codice) {
  const p = leggi().find(x => x.codice === codice);
  if (!p) return '#';
  const sede = SEDI.find(s => s.id === p.sede_id);
  const d = p.data.replaceAll('-', '');
  const t = m => fmt(m).replace(':', '') + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Larosa demo//IT', 'BEGIN:VEVENT', `UID:${p.codice}@larosa-demo`,
    `DTSTART:${d}T${t(p.inizio)}`, `DTEND:${d}T${t(p.fine)}`, `SUMMARY:Parrucchieri Larosa · ${p.servizi.map(s => s.nome).join(', ')}`,
    `LOCATION:${sede.indirizzo}\\, Torino`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}
