import { db, J, getSetting } from './db.js';
import { adesso, hm, fmt, giornoSett, addGiorni } from './tempo.js';

const STATI_OCCUPATI = "('in_attesa','confermata','completata')";

export function chiusoIl(sedeId, staffId, data) {
  return db.prepare(`SELECT motivo FROM chiusure WHERE dal <= ? AND al >= ? AND (
      (sede_id IS NULL AND staff_id IS NULL) OR (sede_id = ? AND staff_id IS NULL) OR (staff_id = ?)
    ) LIMIT 1`).get(data, data, sedeId ?? -1, staffId ?? -1);
}

export function turni(staff, sede, data) {
  if (!sede || chiusoIl(sede.id, staff?.id, data)) return [];
  const orari = (staff && J(staff.orari)) || J(sede.orari, {});
  return (orari[giornoSett(data)] || []).map(([a, b]) => [hm(a), hm(b)]).filter(([a, b]) => b > a);
}

export function occupato(staffId, data, escludiId = 0) {
  return db.prepare(`SELECT inizio, fine FROM prenotazioni WHERE staff_id = ? AND data = ? AND stato IN ${STATI_OCCUPATI} AND id <> ?`)
    .all(staffId, data, escludiId);
}

export function staffIdonei({ sedeId, staffId, servizioIds = [], soloOnline = true }) {
  let righe = db.prepare('SELECT * FROM staff WHERE attivo = 1 AND sede_id = ? ORDER BY ordine, id').all(sedeId);
  if (soloOnline) righe = righe.filter(s => s.prenotabile);
  if (staffId) righe = righe.filter(s => s.id === Number(staffId));
  return righe.filter(s => {
    const abil = J(s.servizi);
    return !abil || !abil.length || servizioIds.every(id => abil.includes(Number(id)));
  });
}

export function durataServizi(servizioIds) {
  if (!servizioIds.length) return { durata: 0, servizi: [] };
  const servizi = servizioIds.map(id => db.prepare('SELECT * FROM servizi WHERE id = ? AND attivo = 1').get(Number(id))).filter(Boolean);
  return { durata: servizi.reduce((t, s) => t + s.durata, 0), servizi };
}

export function slotLiberi({ sedeId, data, durata, staffId, servizioIds = [], admin = false, escludiId = 0 }) {
  const sede = db.prepare('SELECT * FROM sedi WHERE id = ? AND attiva = 1').get(Number(sedeId));
  if (!sede || durata <= 0) return [];
  const ora = adesso();
  if (!admin) {
    if (data < ora.data) return [];
    if (data > addGiorni(ora.data, Number(getSetting('giorni_prenotabili')))) return [];
  }
  const step = Math.max(5, Number(getSetting('intervallo_slot')) || 15);
  const minimo = !admin && data === ora.data ? ora.min + Number(getSetting('anticipo_minimo_ore')) * 60 : 0;
  const mappa = new Map();
  for (const s of staffIdonei({ sedeId: sede.id, staffId, servizioIds, soloOnline: !admin })) {
    const busy = occupato(s.id, data, escludiId);
    for (const [a, b] of turni(s, sede, data)) {
      let t = Math.ceil(Math.max(a, minimo) / step) * step;
      for (; t + durata <= b; t += step) {
        const fine = t + durata;
        if (busy.some(x => t < x.fine && fine > x.inizio)) continue;
        if (!mappa.has(t)) mappa.set(t, []);
        mappa.get(t).push(s.id);
      }
    }
  }
  return [...mappa.entries()].sort((x, y) => x[0] - y[0]).map(([t, staff]) => ({ ora: fmt(t), min: t, staff }));
}

export function giorniDisponibili({ sedeId, mese, durata, staffId, servizioIds }) {
  const [y, m] = mese.split('-').map(Number);
  const giorni = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= giorni; d++) {
    const data = `${mese}-${String(d).padStart(2, '0')}`;
    const n = slotLiberi({ sedeId, data, durata, staffId, servizioIds }).length;
    out.push({ data, slot: n });
  }
  return out;
}

export function scegliStaff(candidati, data) {
  if (candidati.length <= 1) return candidati[0];
  const carichi = candidati.map(id => ({
    id,
    n: db.prepare(`SELECT COALESCE(SUM(fine - inizio), 0) AS t FROM prenotazioni WHERE staff_id = ? AND data = ? AND stato IN ${STATI_OCCUPATI}`).get(id, data).t,
  }));
  carichi.sort((a, b) => a.n - b.n);
  return carichi[0].id;
}

export function libero(staffId, data, inizio, fine, escludiId = 0) {
  return !occupato(staffId, data, escludiId).some(x => inizio < x.fine && fine > x.inizio);
}
