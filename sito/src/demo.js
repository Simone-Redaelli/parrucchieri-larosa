const ORARI = { 0: [], 1: [], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']], 5: [['09:00', '18:00']], 6: [['09:00', '18:00']] };

const SEDI = [
  { id: 1, nome: 'Corso Potenza', indirizzo: 'Corso Potenza 119', cap: '10149', citta: 'Torino', telefono: '+39 351 738 5605', telefono2: '011 733652', whatsapp: '+39 351 738 5605', email: 'larosabylagari@gmail.com', orari: ORARI },
  { id: 2, nome: 'Via Pomba', indirizzo: 'Via Giuseppe Pomba 27', cap: '10123', citta: 'Torino', telefono: '+39 344 757 2204', telefono2: '+39 011 020 3257', whatsapp: '+39 344 757 2204', email: 'parrucchierilarosa.pomba@gmail.com', orari: ORARI },
];
const STAFF = [
  { id: 1, nome: 'Pino', ruolo: 'Hair stylist', sede_id: 1, colore: '#d4a017', servizi: null },
  { id: 2, nome: 'Stylist Potenza', ruolo: 'Hair stylist', sede_id: 1, colore: '#c2577a', servizi: null },
  { id: 3, nome: 'Stylist Pomba', ruolo: 'Hair stylist', sede_id: 2, colore: '#3f7cac', servizi: null },
  { id: 4, nome: 'Colorist Pomba', ruolo: 'Colorist', sede_id: 2, colore: '#5c9e6e', servizi: null },
];
const S = (id, nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo) => ({ id, nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo, online: 1 });
const SERVIZI = [
  S(1, 'Piega corta', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 30, 15, null, 'da'),
  S(2, 'Piega media', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 40, 20, null, 'da'),
  S(3, 'Piega lunga', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 45, 25, null, 'da'),
  S(4, 'Acconciatura sera', 'Piega & Styling', 'Raccolti e acconciature per eventi e serate.', 60, 35, 50, 'range'),
  S(5, 'Taglio donna', 'Taglio', 'Consulenza, taglio su misura e definizione.', 45, 25, 30, 'range'),
  S(6, 'Taglio uomo', 'Taglio', 'Taglio classico o moderno, rifinito a forbice e macchinetta.', 30, 23, 25, 'range'),
  S(7, 'Taglio bimbo', 'Taglio', 'Per i più piccoli, veloce e senza stress.', 20, 20, null, 'fisso'),
  S(8, 'Colore ammonia free', 'Colore', 'Colorazione senza ammoniaca, delicata su cute e capelli.', 90, 35, null, 'da'),
  S(9, 'Colorazione vegetale', 'Colore', 'Vegan color a base di pigmenti vegetali.', 120, 60, null, 'da'),
  S(10, 'Color gloss', 'Colore', 'Tonalizzante: lucentezza e nutrimento su lunghezze e punte.', 30, 25, null, 'da'),
  S(11, 'Perfect white', 'Colore', 'Ridona luce e vita ai capelli bianchi naturali.', 30, 15, null, 'da'),
  S(12, 'New Collection Larosa', 'Colore', 'Colore ispirato alle tecniche Larosa. Prezzo da concordare in salone.', 120, null, null, 'convenire'),
  S(13, 'Balayage', 'Schiariture', 'Schiaritura sfumata a mano libera, effetto naturale.', 150, 60, null, 'da'),
  S(14, 'Meches con stagnola', 'Schiariture', 'Meches classiche con stagnola.', 120, 50, 120, 'range'),
  S(15, 'Schiariture parziali', 'Schiariture', 'Punti luce mirati per illuminare il viso.', 90, 35, null, 'da'),
  S(16, 'High light', 'Schiariture', 'Riflessi luminosi su tutta la chioma.', 120, 50, null, 'da'),
  S(17, 'Rituel Express', 'Trattamenti', 'Bain + 1 fusio-dose + 1 pre-styling.', 20, 15, null, 'fisso'),
  S(18, 'Rituel Intense', 'Trattamenti', 'Bain + 1 soin + trattamento cuoio capelluto + pre-styling.', 30, 25, null, 'fisso'),
  S(19, 'Rituel Unique', 'Trattamenti', 'Bain + fusio-dose + fonte di calore + soin + pre-styling.', 30, 25, null, 'fisso'),
  S(20, 'Rituel Exfoliant', 'Trattamenti', 'Pulizia profonda del cuoio capelluto.', 20, 15, null, 'fisso'),
  S(21, 'Trattamento Steam Pod', 'Trattamenti', 'Lisciatura a vapore che protegge la fibra.', 15, 5, null, 'fisso'),
  S(22, 'Ondulazione completa', 'Forma & Liscio', 'Permanente per onde e ricci duraturi.', 120, 70, null, 'da'),
  S(23, 'Laminazione capelli', 'Forma & Liscio', 'Capelli lisci, lucidi e disciplinati.', 90, 85, null, 'da'),
  S(24, 'Antigiallo uomo', 'Uomo', 'Man color: neutralizza i riflessi gialli.', 15, 10, null, 'da'),
];
const SALONE = { nome: 'Parrucchieri Larosa', slogan: 'Il tuo aspetto è la miglior pubblicità del nostro successo.', partita_iva: '13160320019', instagram: '', facebook: '', giorni_prenotabili: 60, conferma_automatica: false, annullamento_ore: 12 };

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

function occupati(staffId, data) {
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
