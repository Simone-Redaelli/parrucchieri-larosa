export const desktop = typeof window !== 'undefined' && !!window.larosaDesktop;
export const serveServer = () => desktop || !location.protocol.startsWith('http');

export function server() {
  return serveServer() ? (localStorage.getItem('larosa-server') || '').replace(/\/+$/, '') : '';
}
export function impostaServer(url) {
  let u = String(url || '').trim().replace(/\/+$/, '').replace(/\/gestionale$/, '');
  if (u && !/^https?:\/\//.test(u)) u = 'https://' + u;
  localStorage.setItem('larosa-server', u);
  return u;
}


export const token = () => localStorage.getItem('larosa-token');
export const salvaToken = t => t ? localStorage.setItem('larosa-token', t) : localStorage.removeItem('larosa-token');

let suScaduta = () => {};
export const quandoScade = f => { suScaduta = f; };

export async function api(percorso, { metodo = 'GET', corpo } = {}) {
  let r;
  try {
    r = await fetch(`${server()}/api${percorso}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Server non raggiungibile. Controlla la connessione.'), { status: 0 });
  }
  const dati = await r.json().catch(() => ({}));
  if (r.status === 401 && percorso !== '/admin/login') suScaduta();
  if (!r.ok) throw Object.assign(new Error(dati.errore || `Errore ${r.status}`), { status: r.status });
  return dati;
}
export const get = p => api(p);
export const post = (p, c) => api(p, { metodo: 'POST', corpo: c ?? {} });
export const patch = (p, c) => api(p, { metodo: 'PATCH', corpo: c });
export const del = p => api(p, { metodo: 'DELETE' });

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const oggi = () => iso(new Date());
export const piuGiorni = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const lunedi = s => { const d = new Date(s + 'T12:00:00'); return piuGiorni(s, -((d.getDay() + 6) % 7)); };
export const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const G = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const GC = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const M = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const dataLunga = s => { const d = new Date(s + 'T12:00:00'); return `${G[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`; };
export const dataCorta = s => { const d = new Date(s + 'T12:00:00'); return `${GC[d.getDay()]} ${d.getDate()} ${M[d.getMonth()].slice(0, 3)}`; };
export const meseAnno = s => { const d = new Date(s + 'T12:00:00'); return `${M[d.getMonth()]} ${d.getFullYear()}`; };
export const giornoSett = s => new Date(s + 'T12:00:00').getDay();
export const relativo = s => {
  const diff = Math.round((new Date(s + 'T12:00:00') - new Date(oggi() + 'T12:00:00')) / 864e5);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'domani';
  if (diff === -1) return 'ieri';
  return dataCorta(s);
};

export const euro = n => n == null ? '–' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const durata = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`;
export function prezzoServizio(s) {
  if (s.tipo_prezzo === 'convenire' || s.prezzo == null) return 'da concordare';
  if (s.tipo_prezzo === 'range' && s.prezzo_max) return `${s.prezzo}–${s.prezzo_max} €`;
  return `${s.tipo_prezzo === 'da' ? 'da ' : ''}${s.prezzo} €`;
}
export const nomeCompleto = p => [p.cliente_nome ?? p.nome, p.cliente_cognome ?? p.cognome].filter(Boolean).join(' ');
export const iniziali = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
export const telLink = t => `tel:${String(t || '').replace(/[^\d+]/g, '')}`;
export const waLink = (t, testo = '') => `https://wa.me/${String(t || '').replace(/\D/g, '')}${testo ? `?text=${encodeURIComponent(testo)}` : ''}`;

export const STATI = {
  in_attesa: { nome: 'Da confermare', classe: 'attesa' },
  confermata: { nome: 'Confermata', classe: 'ok' },
  completata: { nome: 'Completata', classe: 'fatta' },
  cancellata: { nome: 'Annullata', classe: 'spenta' },
  rifiutata: { nome: 'Rifiutata', classe: 'no' },
  no_show: { nome: 'Non presentato', classe: 'no' },
};
export const ORIGINI = { online: 'Sito', gestionale: 'Gestionale', telefono: 'Telefono', walkin: 'Senza appuntamento' };

export function apriEsterno(url) {
  if (window.larosaDesktop?.apri) window.larosaDesktop.apri(url);
  else window.open(url, '_blank', 'noopener');
}
