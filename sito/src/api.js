import { demoApi, demoIcs } from './demo.js';

const BASE = import.meta.env.VITE_API || '';
export const DEMO = import.meta.env.VITE_DEMO === '1';

export async function api(percorso, opzioni = {}) {
  if (DEMO) return demoApi(percorso, { body: opzioni.body ? JSON.stringify(opzioni.body) : undefined });
  const r = await fetch(`${BASE}/api${percorso}`, {
    ...opzioni,
    headers: { 'Content-Type': 'application/json', ...(opzioni.headers || {}) },
    body: opzioni.body ? JSON.stringify(opzioni.body) : undefined,
  });
  const dati = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(dati.errore || 'Qualcosa non ha funzionato. Riprova.'), { status: r.status });
  return dati;
}

export const icsUrl = codice => DEMO ? demoIcs(codice) : `${BASE}/api/prenotazione/${codice}/calendario.ics`;

export function prezzo(s) {
  if (!s) return '';
  if (s.tipo_prezzo === 'convenire' || s.prezzo == null) return 'da concordare';
  if (s.tipo_prezzo === 'range' && s.prezzo_max) return `${s.prezzo}–${s.prezzo_max} €`;
  if (s.tipo_prezzo === 'da') return `da ${s.prezzo} €`;
  return `${s.prezzo} €`;
}

export function durata(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function totale(servizi) {
  const base = servizi.reduce((t, s) => t + (s.prezzo || 0), 0);
  const variabile = servizi.some(s => s.tipo_prezzo !== 'fisso');
  return { base, variabile, testo: base ? `${variabile ? 'da ' : ''}${base} €` : 'da concordare' };
}

export const telLink = t => `tel:${String(t || '').replace(/[^\d+]/g, '')}`;
export const waLink = (t, testo = '') => `https://wa.me/${String(t || '').replace(/\D/g, '')}${testo ? `?text=${encodeURIComponent(testo)}` : ''}`;

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
export function orariLeggibili(orari) {
  const righe = [];
  const ordine = [1, 2, 3, 4, 5, 6, 0];
  for (const g of ordine) {
    const t = (orari?.[g] || []).map(([a, b]) => `${a}–${b}`).join(', ') || 'Chiuso';
    const ultima = righe[righe.length - 1];
    if (ultima && ultima.t === t) ultima.a = g; else righe.push({ da: g, a: g, t });
  }
  return righe.map(r => ({ giorni: r.da === r.a ? GIORNI[r.da] : `${GIORNI[r.da]} – ${GIORNI[r.a]}`, orario: r.t }));
}

export const FOTO = [
  'https://irp.cdn-website.com/6fbf2599/dms3rep/multi/opt/larosa-parrucchieritorinohome-gallery01-640w.jpg',
  'https://irp.cdn-website.com/6fbf2599/dms3rep/multi/opt/larosa-parrucchieritorinohome-gallery02-640w.jpg',
  'https://irp.cdn-website.com/6fbf2599/dms3rep/multi/opt/larosa-parrucchieritorinohome-gallery03-640w.jpg',
  'https://irp.cdn-website.com/6fbf2599/dms3rep/multi/opt/larosa-parrucchieritorinohome-gallery04-640w.jpg',
];
