import { ORARI, SEDI, STAFF, SERVIZI } from '../../condivisi/demo-dati.js';

const CHIAVE = 'larosa-gestionale-demo';
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const oggi = () => iso(new Date());
const piu = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const giornoSett = s => new Date(s + 'T12:00:00').getDay();
const adessoMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const ts = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ');
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dataEstesa = s => { const d = new Date(s + 'T12:00:00'); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };
const errore = (msg, status = 400) => Object.assign(new Error(msg), { status });
const r = n => Math.floor(Math.random() * n);
const pick = a => a[r(a.length)];
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codice = () => 'LR-' + Array.from({ length: 8 }, () => ALFA[r(ALFA.length)]).join('');
const OCCUPA = ['in_attesa', 'confermata', 'completata'];

const NOMI = ['Giulia', 'Francesca', 'Chiara', 'Sara', 'Martina', 'Elena', 'Valentina', 'Alessia', 'Federica', 'Silvia', 'Paola', 'Roberta', 'Laura', 'Marta', 'Anna', 'Simona', 'Ilaria', 'Beatrice', 'Marco', 'Luca', 'Andrea', 'Davide', 'Matteo', 'Stefano'];
const COGNOMI = ['Rossi', 'Bianchi', 'Ferrero', 'Gallo', 'Costa', 'Fontana', 'Conti', 'Ricci', 'Bruno', 'Greco', 'Marino', 'Rinaldi', 'Colombo', 'Barbieri', 'Moretti', 'Lombardi', 'Esposito', 'Romano'];
const COMBO = [['Piega media'], ['Taglio donna', 'Piega media'], ['Colore ammonia free', 'Piega corta'], ['Taglio uomo'], ['Balayage', 'Piega lunga'], ['Piega lunga'], ['Color gloss', 'Piega media'], ['Rituel Intense', 'Piega corta'], ['Taglio donna'], ['Meches con stagnola', 'Piega media'], ['Taglio bimbo'], ['Laminazione capelli']];

let db = null;

function snap(s) { return { id: s.id, nome: s.nome, durata: s.durata, prezzo: s.prezzo, prezzo_max: s.prezzo_max, tipo_prezzo: s.tipo_prezzo }; }

function crea() {
  const d = {
    seq: { clienti: 0, prenotazioni: 0, chiusure: 0, servizi: 100, staff: 10, utenti: 1 },
    sedi: SEDI.map((s, i) => ({ ...s, attiva: 1, ordine: i + 1 })),
    staff: STAFF.map((s, i) => ({ ...s, bio: '', orari: null, servizi: null, prenotabile: 1, attivo: 1, ordine: i + 1 })),
    servizi: SERVIZI.map((s, i) => ({ ...s, attivo: 1, ordine: i + 1 })),
    clienti: [], prenotazioni: [], chiusure: [],
    impostazioni: {
      nome_salone: 'Parrucchieri Larosa', slogan: 'Il tuo aspetto è la miglior pubblicità del nostro successo.', partita_iva: '13160320019',
      conferma_automatica: '0', anticipo_minimo_ore: '2', giorni_prenotabili: '60', intervallo_slot: '15', annullamento_ore: '12', instagram: '', facebook: '',
      messaggio_conferma: 'Ciao {nome}! La tua prenotazione da Parrucchieri Larosa per {data} alle {ora} in {sede} è confermata. Codice {codice}. A presto!',
      messaggio_rifiuto: 'Ciao {nome}, purtroppo per {data} alle {ora} non riusciamo a riceverti. Scrivici o chiamaci per trovare un altro orario!',
    },
    utenti: [{ id: 1, nome: 'Pino Larosa', email: 'demo@larosa.it', ruolo: 'titolare', staff_id: 1, creato_il: ts() }],
  };
  const t = oggi();
  for (let i = 0; i < 70; i++) {
    const n = pick(NOMI), c = pick(COGNOMI);
    d.clienti.push({ id: ++d.seq.clienti, nome: n, cognome: c, telefono: `+393${r(10)}${r(10)}${1000000 + r(8999999)}`, email: Math.random() < .5 ? `${n}.${c}@esempio.it`.toLowerCase() : null, note: null, compleanno: null, marketing: r(2), creato_il: `${piu(t, -r(120))} 10:00:00` });
  }
  for (let g = -30; g <= 14; g++) {
    const data = piu(t, g);
    for (const s of d.staff) {
      for (const [a, b] of ORARI[giornoSett(data)] || []) {
        let m = hm(a) + r(3) * 15;
        const fine = hm(b);
        const dens = g < 0 ? .78 : g < 4 ? .65 : .35;
        while (m < fine - 30) {
          const combo = pick(COMBO).map(nome => d.servizi.find(x => x.nome === nome));
          const dur = combo.reduce((x, y) => x + y.durata, 0);
          if (m + dur > fine) break;
          if (Math.random() < dens) {
            const servizi = combo.map(snap);
            const stima = servizi.reduce((x, y) => x + (y.prezzo || 0), 0);
            const stato = g < 0 ? (Math.random() < .93 ? 'completata' : Math.random() < .5 ? 'no_show' : 'cancellata') : (g === 0 && m < adessoMin() ? 'completata' : (g > 0 && Math.random() < .14 ? 'in_attesa' : 'confermata'));
            d.prenotazioni.push({
              id: ++d.seq.prenotazioni, codice: codice(), cliente_id: 1 + r(d.clienti.length), sede_id: s.sede_id, staff_id: s.id, data, inizio: m, fine: m + dur,
              servizi, prezzo_stimato: stima, prezzo_finale: stato === 'completata' ? stima + pick([0, 0, 5, 10, 15, -5]) : null, stato,
              origine: stato === 'in_attesa' ? 'online' : pick(['online', 'online', 'online', 'telefono', 'walkin']), note_cliente: Math.random() < .1 ? 'Capelli molto lunghi, grazie!' : null, note_interne: null,
              creata_il: `${piu(data, -r(10) - 1)} ${10 + r(8)}:${10 + r(49)}:00`, aggiornata_il: ts(),
            });
          }
          m += dur + pick([0, 0, 15, 15, 30, 45]);
        }
      }
    }
  }
  return d;
}

function carica() {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(CHIAVE)); } catch { db = null; }
  if (!db || db.creato !== oggi()) { db = crea(); db.creato = oggi(); db.importati = []; salva(); }
  db.importati ??= [];
  return db;
}

function importaDalSito(avvisa = true) {
  carica();
  let coda = [];
  try { coda = JSON.parse(localStorage.getItem('larosa-demo-coda') || '[]'); } catch {}
  for (const x of coda) {
    if (db.importati.includes(x.codice)) continue;
    db.importati.push(x.codice);
    if (x.data < oggi()) continue;
    try {
      const staffId = x.staff_id || db.staff.find(s => s.sede_id === Number(x.sede_id) && s.attivo)?.id;
      const p = creaPrenotazione({ ...x, staff_id: staffId, forza: true, note: x.note }, 'online');
      const reale = db.prenotazioni.find(y => y.id === p.id);
      reale.codice = x.codice;
      salva();
      if (avvisa) emetti('prenotazione', { tipo: 'nuova', prenotazione: dettaglio(reale), da: null });
    } catch {}
  }
  salva();
}

function aggiornaSito(p) {
  try {
    const lista = JSON.parse(localStorage.getItem('larosa-demo') || '[]');
    const x = lista.find(y => y.codice === p.codice);
    if (!x) return;
    Object.assign(x, { stato: p.stato, data: p.data, inizio: p.inizio, fine: p.fine, staff_id: p.staff_id, sede_id: p.sede_id });
    localStorage.setItem('larosa-demo', JSON.stringify(lista));
  } catch {}
}
function salva() { try { localStorage.setItem(CHIAVE, JSON.stringify(db)); } catch {} }
export function ricominciaDemo() { localStorage.removeItem(CHIAVE); db = null; }

const sede = id => db.sedi.find(s => s.id === id);
const staff = id => db.staff.find(s => s.id === id);
const cliente = id => db.clienti.find(c => c.id === id);

function dettaglio(p) {
  const c = cliente(p.cliente_id) || {}, s = sede(p.sede_id) || {}, st = staff(p.staff_id) || {};
  return {
    ...p, cliente_nome: c.nome, cliente_cognome: c.cognome, cliente_telefono: c.telefono, cliente_email: c.email,
    sede_nome: s.nome, sede_indirizzo: s.indirizzo, sede_telefono: s.telefono, sede_whatsapp: s.whatsapp,
    staff_nome: st.nome, staff_colore: st.colore, ora: fmt(p.inizio), ora_fine: fmt(p.fine), durata: p.fine - p.inizio,
  };
}
const chiuso = (sedeId, staffId, data) => db.chiusure.some(c => c.dal <= data && c.al >= data && ((!c.sede_id && !c.staff_id) || (c.sede_id === sedeId && !c.staff_id) || c.staff_id === staffId));
function turni(s, data) {
  const se = sede(s.sede_id);
  if (!se || chiuso(se.id, s.id, data)) return [];
  return ((s.orari || se.orari)[giornoSett(data)] || []).map(([a, b]) => [hm(a), hm(b)]);
}
const occupato = (staffId, data, escludi = 0) => db.prenotazioni.filter(p => p.staff_id === staffId && p.data === data && OCCUPA.includes(p.stato) && p.id !== escludi);
const libero = (staffId, data, a, b, escludi) => !occupato(staffId, data, escludi).some(x => a < x.fine && b > x.inizio);

function slot({ sedeId, data, durata, staffId, servizi = [], escludi = 0, admin = true }) {
  const step = Number(db.impostazioni.intervallo_slot) || 15;
  const minimo = !admin && data === oggi() ? adessoMin() + Number(db.impostazioni.anticipo_minimo_ore) * 60 : 0;
  const mappa = new Map();
  for (const s of db.staff.filter(x => x.attivo && x.sede_id === sedeId && (!staffId || x.id === staffId) && (!x.servizi?.length || servizi.every(id => x.servizi.includes(id))))) {
    const busy = occupato(s.id, data, escludi);
    for (const [a, b] of turni(s, data)) {
      for (let t = Math.ceil(Math.max(a, minimo) / step) * step; t + durata <= b; t += step) {
        if (busy.some(x => t < x.fine && t + durata > x.inizio)) continue;
        if (!mappa.has(t)) mappa.set(t, []);
        mappa.get(t).push(s.id);
      }
    }
  }
  return [...mappa.entries()].sort((a, b) => a[0] - b[0]).map(([t, st]) => ({ ora: fmt(t), min: t, staff: st }));
}

function messaggio(p, tipo) {
  const tpl = db.impostazioni[tipo === 'rifiuto' ? 'messaggio_rifiuto' : 'messaggio_conferma'] || '';
  return tpl.replaceAll('{nome}', p.cliente_nome || '').replaceAll('{data}', dataEstesa(p.data)).replaceAll('{ora}', p.ora)
    .replaceAll('{sede}', `${p.sede_nome} (${p.sede_indirizzo})`).replaceAll('{codice}', p.codice).replaceAll('{servizi}', p.servizi.map(s => s.nome).join(', '));
}

function trovaCliente(b) {
  if (b.cliente_id) return Number(b.cliente_id);
  const tel = String(b.telefono || '').replace(/[^\d+]/g, '');
  const esiste = tel && db.clienti.find(c => (c.telefono || '').replace(/\D/g, '').endsWith(tel.replace(/\D/g, '').slice(-9)));
  if (esiste) return esiste.id;
  const c = { id: ++db.seq.clienti, nome: b.nome, cognome: b.cognome || null, telefono: tel ? (tel.startsWith('+') ? tel : '+39' + tel) : null, email: b.email || null, note: null, compleanno: null, marketing: 0, creato_il: ts() };
  db.clienti.push(c);
  return c.id;
}

function creaPrenotazione(b, origine) {
  const ids = (b.servizi || []).map(Number);
  const servizi = ids.map(id => db.servizi.find(s => s.id === id)).filter(Boolean);
  if (!servizi.length) throw errore('Scegli almeno un servizio.');
  const durata = servizi.reduce((t, s) => t + s.durata, 0);
  const sedeId = Number(b.sede_id), inizio = hm(b.ora);
  let staffId = b.staff_id ? Number(b.staff_id) : null;
  if (b.forza) {
    if (!staffId) throw errore('Scegli lo stylist.');
  } else {
    const s = slot({ sedeId, data: b.data, durata, staffId, servizi: ids }).find(x => x.min === inizio);
    if (!s) throw errore('Questo orario è appena stato preso. Scegline un altro.', 409);
    staffId = staffId || s.staff[0];
  }
  const p = {
    id: ++db.seq.prenotazioni, codice: codice(), cliente_id: trovaCliente(b), sede_id: sedeId, staff_id: staffId, data: b.data, inizio, fine: inizio + durata,
    servizi: servizi.map(snap), prezzo_stimato: servizi.reduce((t, s) => t + (s.prezzo || 0), 0), prezzo_finale: null,
    stato: origine === 'online' ? 'in_attesa' : (b.stato || 'confermata'), origine: origine === 'online' ? 'online' : (b.origine || 'gestionale'),
    note_cliente: b.note || null, note_interne: b.note_interne || null, creata_il: ts(), aggiornata_il: ts(),
  };
  db.prenotazioni.push(p);
  salva();
  return dettaglio(p);
}

function aggiorna(id, b) {
  const p = db.prenotazioni.find(x => x.id === id);
  if (!p) throw errore('Prenotazione non trovata.', 404);
  if (Array.isArray(b.servizi)) {
    p.servizi = b.servizi.map(i => db.servizi.find(s => s.id === Number(i))).filter(Boolean).map(snap);
    p.prezzo_stimato = p.servizi.reduce((t, s) => t + (s.prezzo || 0), 0);
  }
  if (b.data || b.ora || b.staff_id || b.sede_id || Array.isArray(b.servizi)) {
    const data = b.data || p.data, inizio = b.ora ? hm(b.ora) : p.inizio;
    const durata = Array.isArray(b.servizi) ? p.servizi.reduce((t, s) => t + s.durata, 0) : p.fine - p.inizio;
    const st = b.staff_id ? Number(b.staff_id) : p.staff_id;
    if (!b.forza && !libero(st, data, inizio, inizio + durata, p.id)) throw errore('In quell’orario l’operatore ha già un appuntamento.', 409);
    Object.assign(p, { data, inizio, fine: inizio + durata, staff_id: st });
    if (b.sede_id) p.sede_id = Number(b.sede_id);
  }
  if (b.stato) p.stato = b.stato;
  if ('note_interne' in b) p.note_interne = b.note_interne || null;
  if ('prezzo_finale' in b) p.prezzo_finale = b.prezzo_finale === '' || b.prezzo_finale == null ? null : Number(b.prezzo_finale);
  p.aggiornata_il = ts();
  salva();
  aggiornaSito(p);
  return dettaglio(p);
}

function dashboard(t) {
  const lun = piu(t, -((giornoSett(t) + 6) % 7));
  const da30 = piu(t, -29), inizioMese = t.slice(0, 8) + '01';
  const val = p => OCCUPA.includes(p.stato);
  const euro = p => p.prezzo_finale ?? p.prezzo_stimato ?? 0;
  const ord = l => l.sort((a, b) => a.data.localeCompare(b.data) || a.inizio - b.inizio);
  const appOggi = ord(db.prenotazioni.filter(p => p.data === t && !['cancellata', 'rifiutata'].includes(p.stato))).map(dettaglio);
  const inAttesa = ord(db.prenotazioni.filter(p => p.stato === 'in_attesa' && p.data >= oggi())).map(dettaglio);
  let disp = 0;
  for (const s of db.staff.filter(x => x.attivo)) for (const [a, b] of turni(s, t)) disp += b - a;
  const occ = appOggi.filter(p => p.stato !== 'no_show').reduce((x, p) => x + p.durata, 0);
  const andamento = Array.from({ length: 30 }, (_, i) => {
    const d = piu(da30, i);
    const l = db.prenotazioni.filter(p => p.data === d && val(p));
    return { data: d, n: l.length, incasso: l.reduce((x, p) => x + euro(p), 0) };
  });
  const top = {};
  for (const p of db.prenotazioni.filter(p => p.data >= da30 && p.data <= t && val(p))) for (const s of p.servizi) { top[s.nome] ??= { nome: s.nome, n: 0, incasso: 0 }; top[s.nome].n++; top[s.nome].incasso += s.prezzo || 0; }
  const perStaff = db.staff.filter(s => s.attivo).map(s => {
    const l = db.prenotazioni.filter(p => p.staff_id === s.id && p.data >= da30 && p.data <= t && val(p));
    return { id: s.id, nome: s.nome, colore: s.colore, n: l.length, incasso: l.reduce((x, p) => x + euro(p), 0) };
  }).sort((a, b) => b.incasso - a.incasso);
  const sett = db.prenotazioni.filter(p => p.data >= lun && p.data <= piu(lun, 6) && val(p));
  const mese = db.prenotazioni.filter(p => p.data >= inizioMese && p.data <= t.slice(0, 8) + '31' && val(p));
  return {
    oggi: t, ora: fmt(adessoMin()), appuntamenti: appOggi, in_attesa: inAttesa,
    kpi: {
      oggi: appOggi.length, settimana: sett.length, mese: mese.length,
      incasso_oggi: db.prenotazioni.filter(p => p.data === t && p.stato === 'completata').reduce((x, p) => x + euro(p), 0),
      incasso_mese: mese.reduce((x, p) => x + euro(p), 0),
      nuovi_clienti: db.clienti.filter(c => c.creato_il >= inizioMese).length,
      occupazione: disp ? Math.round(occ / disp * 100) : 0,
      no_show_30: db.prenotazioni.filter(p => p.stato === 'no_show' && p.data >= da30 && p.data <= t).length,
    },
    andamento, top_servizi: Object.values(top).sort((a, b) => b.n - a.n).slice(0, 6), staff: perStaff, origine: [],
  };
}

function listaClienti(q, ordine) {
  const t = oggi();
  let l = db.clienti.map(c => {
    const pp = db.prenotazioni.filter(p => p.cliente_id === c.id);
    const fatte = pp.filter(p => p.stato === 'completata');
    return {
      ...c, visite: pp.length, ultima_visita: fatte.map(p => p.data).sort().pop() || null,
      prossima: pp.filter(p => p.data >= t && ['in_attesa', 'confermata'].includes(p.stato)).map(p => p.data).sort()[0] || null,
      speso: fatte.reduce((x, p) => x + (p.prezzo_finale ?? p.prezzo_stimato ?? 0), 0), no_show: pp.filter(p => p.stato === 'no_show').length,
    };
  });
  if (q) { const s = q.toLowerCase(); l = l.filter(c => `${c.nome} ${c.cognome || ''}`.toLowerCase().includes(s) || (c.telefono || '').includes(s) || (c.email || '').toLowerCase().includes(s)); }
  if (ordine === 'speso') l.sort((a, b) => b.speso - a.speso);
  else if (ordine === 'recenti') l.sort((a, b) => b.creato_il.localeCompare(a.creato_il));
  else l.sort((a, b) => `${a.nome} ${a.cognome}`.localeCompare(`${b.nome} ${b.cognome}`));
  return l;
}

function crud(lista, metodo, id, b, campi) {
  const arr = db[lista];
  if (metodo === 'GET') return [...arr].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0) || a.id - b.id);
  if (metodo === 'POST') {
    const n = { id: ++db.seq[lista] };
    for (const c of campi) n[c] = b[c] ?? null;
    arr.push(n); salva(); emetti('config', {}); return n;
  }
  const el = arr.find(x => x.id === id);
  if (!el) throw errore('Non trovato.', 404);
  if (metodo === 'PATCH') { for (const c of campi) if (c in b) el[c] = typeof b[c] === 'boolean' ? (b[c] ? 1 : 0) : (b[c] === '' ? null : b[c]); salva(); emetti('config', {}); return el; }
  if (metodo === 'DELETE') { db[lista] = arr.filter(x => x.id !== id); salva(); emetti('config', {}); return { ok: true }; }
}

const ascoltatori = new Set();
export function suEvento(fn) { ascoltatori.add(fn); return () => ascoltatori.delete(fn); }
function emetti(tipo, dati) { for (const f of ascoltatori) f(tipo, dati); }

let timer = null;
export function avviaSimulazione() {
  if (timer) return;
  importaDalSito(false);
  window.addEventListener('storage', e => { if (e.key === 'larosa-demo-coda') importaDalSito(); });
  setInterval(() => importaDalSito(), 4000);
  const prossima = () => { timer = setTimeout(nuovaDalSito, 35000 + r(25000)); };
  const nuovaDalSito = () => {
    carica();
    try {
      for (let tentativi = 0; tentativi < 20; tentativi++) {
        const data = piu(oggi(), 1 + r(10));
        const combo = pick(COMBO).map(nome => db.servizi.find(s => s.nome === nome && s.attivo)).filter(Boolean);
        const s = pick(db.sedi);
        const liberi = slot({ sedeId: s.id, data, durata: combo.reduce((x, y) => x + y.durata, 0), servizi: combo.map(c => c.id), admin: false });
        if (!liberi.length) continue;
        const sl = pick(liberi);
        const p = creaPrenotazione({ servizi: combo.map(c => c.id), sede_id: s.id, data, ora: sl.ora, cliente_id: 1 + r(db.clienti.length) }, 'online');
        emetti('prenotazione', { tipo: 'nuova', prenotazione: p, da: null });
        break;
      }
    } catch {}
    prossima();
  };
  timer = setTimeout(nuovaDalSito, 12000);
}

export async function demoApi(percorso, { metodo = 'GET', corpo } = {}) {
  carica();
  await new Promise(ok => setTimeout(ok, 80 + r(120)));
  const [via, query = ''] = percorso.split('?');
  const q = Object.fromEntries(new URLSearchParams(query));
  const b = corpo || {};
  const parti = via.replace(/^\/admin\/?/, '').split('/');
  const [risorsa, idStr] = parti;
  const id = Number(idStr);

  switch (risorsa) {
    case 'stato': return { configurato: true, nome: db.impostazioni.nome_salone };
    case 'login': case 'setup': return { token: 'demo', utente: db.utenti[0] };
    case 'me': return db.utenti[0];
    case 'password': return { ok: true };
    case 'push': return { chiave: '' };
    case 'dashboard': return dashboard(q.data || oggi());
    case 'slot': {
      const servizi = String(q.servizi || '').split(',').map(Number).filter(Boolean);
      const durata = Number(q.durata) || servizi.reduce((t, i) => t + (db.servizi.find(s => s.id === i)?.durata || 0), 0);
      return durata ? slot({ sedeId: Number(q.sede), data: q.data, durata, staffId: q.staff ? Number(q.staff) : null, servizi, escludi: Number(q.escludi) || 0 }) : [];
    }
    case 'agenda': {
      const dal = q.dal || oggi(), al = q.al || dal, giorni = [];
      for (let d = dal; d <= al && giorni.length < 42; d = piu(d, 1)) giorni.push({ data: d, turni: Object.fromEntries(db.staff.filter(s => s.attivo).map(s => [s.id, turni(s, d)])) });
      const pren = db.prenotazioni.filter(p => p.data >= dal && p.data <= al && p.stato !== 'rifiutata').sort((a, b) => a.data.localeCompare(b.data) || a.inizio - b.inizio).map(dettaglio);
      return { giorni, prenotazioni: pren };
    }
    case 'prenotazioni': {
      if (metodo === 'POST') { const p = creaPrenotazione(b, 'gestionale'); emetti('prenotazione', { tipo: 'nuova', prenotazione: p, da: db.utenti[0].nome }); return p; }
      if (metodo === 'PATCH') { const p = aggiorna(id, b); emetti('prenotazione', { tipo: 'aggiornata', prenotazione: p, da: db.utenti[0].nome }); return p; }
      if (metodo === 'DELETE') { db.prenotazioni = db.prenotazioni.filter(p => p.id !== id); salva(); emetti('prenotazione', { tipo: 'eliminata', id }); return { ok: true }; }
      if (idStr) {
        const p = db.prenotazioni.find(x => x.id === id);
        if (!p) throw errore('Prenotazione non trovata.', 404);
        const d = dettaglio(p);
        return { ...d, whatsapp_conferma: messaggio(d, 'conferma'), whatsapp_rifiuto: messaggio(d, 'rifiuto') };
      }
      let l = db.prenotazioni;
      if (q.dal) l = l.filter(p => p.data >= q.dal);
      if (q.al) l = l.filter(p => p.data <= q.al);
      if (q.sede) l = l.filter(p => p.sede_id === Number(q.sede));
      if (q.staff) l = l.filter(p => p.staff_id === Number(q.staff));
      if (q.cliente) l = l.filter(p => p.cliente_id === Number(q.cliente));
      if (q.stato) { const st = q.stato.split(','); l = l.filter(p => st.includes(p.stato)); }
      l = l.map(dettaglio);
      if (q.q) { const s = q.q.toLowerCase(); l = l.filter(p => `${p.cliente_nome} ${p.cliente_cognome || ''}`.toLowerCase().includes(s) || (p.cliente_telefono || '').includes(s) || p.codice.toLowerCase().includes(s) || p.servizi.some(x => x.nome.toLowerCase().includes(s))); }
      if (q.ordine === 'recenti') l.sort((a, b) => b.creata_il.localeCompare(a.creata_il));
      else if (q.ordine === 'desc') l.sort((a, b) => b.data.localeCompare(a.data) || b.inizio - a.inizio);
      else l.sort((a, b) => a.data.localeCompare(b.data) || a.inizio - b.inizio);
      return l.slice(0, Number(q.limite) || 500);
    }
    case 'clienti': {
      if (metodo === 'GET' && !idStr) return listaClienti(q.q, q.ordine);
      if (metodo === 'GET') {
        const c = cliente(id);
        if (!c) throw errore('Cliente non trovato.', 404);
        return { ...c, storico: db.prenotazioni.filter(p => p.cliente_id === id).sort((a, b) => b.data.localeCompare(a.data) || b.inizio - a.inizio).map(dettaglio) };
      }
      if (!['DELETE'].includes(metodo) && !String(b.nome || '').trim()) throw errore('Il nome è obbligatorio.');
      return crud('clienti', metodo, id, { ...b, creato_il: b.creato_il || ts() }, ['nome', 'cognome', 'telefono', 'email', 'note', 'compleanno', 'marketing', 'creato_il']);
    }
    case 'servizi': return crud('servizi', metodo, id, b, ['nome', 'categoria', 'descrizione', 'durata', 'prezzo', 'prezzo_max', 'tipo_prezzo', 'online', 'attivo', 'ordine']);
    case 'staff': return crud('staff', metodo, id, b, ['nome', 'ruolo', 'bio', 'sede_id', 'colore', 'orari', 'servizi', 'prenotabile', 'attivo', 'ordine']);
    case 'sedi': return crud('sedi', metodo, id, b, ['nome', 'indirizzo', 'cap', 'citta', 'telefono', 'telefono2', 'whatsapp', 'email', 'orari', 'attiva', 'ordine']);
    case 'chiusure': return crud('chiusure', metodo, id, b, ['sede_id', 'staff_id', 'dal', 'al', 'motivo']);
    case 'impostazioni':
      if (metodo === 'PATCH') { Object.assign(db.impostazioni, Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : v]))); salva(); emetti('config', {}); }
      return { ...db.impostazioni };
    case 'utenti':
      if (metodo === 'POST') { const u = { id: ++db.seq.utenti, nome: b.nome, email: b.email, ruolo: b.ruolo, staff_id: b.staff_id || null, creato_il: ts() }; db.utenti.push(u); salva(); return u; }
      if (metodo === 'DELETE') { db.utenti = db.utenti.filter(u => u.id !== id); salva(); return { ok: true }; }
      if (metodo === 'PATCH') return db.utenti.find(u => u.id === id);
      return db.utenti;
    default: throw errore('Percorso non trovato', 404);
  }
}
