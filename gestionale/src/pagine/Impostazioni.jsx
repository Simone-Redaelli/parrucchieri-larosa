import { useEffect, useState } from 'react';
import { Bell, Globe, MessageCircle, Palette, KeyRound, Users, Smartphone, Trash2, Plus, Monitor } from 'lucide-react';
import { useApp } from '../App.jsx';
import { DEMO, api, get, post, patch, del, desktop, server, impostaServer, salvaToken } from '../api.js';
import { Campo, Interruttore, Segmenti, useToast, useConferma, Modale } from '../ui.jsx';

function base64ToUint8(b) {
  const pad = '='.repeat((4 - (b.length % 4)) % 4);
  const raw = atob((b + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function Impostazioni({ tema, setTema }) {
  const { cfg, ricaricaCfg, titolare, utente } = useApp();
  const toast = useToast();
  const [f, setF] = useState(cfg.impostazioni);
  useEffect(() => setF(cfg.impostazioni), [cfg.impostazioni]);
  const cambiate = JSON.stringify(f) !== JSON.stringify(cfg.impostazioni);
  const c = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const s = k => v => setF(x => ({ ...x, [k]: v ? '1' : '0' }));

  async function salva() {
    try { await patch('/admin/impostazioni', f); await ricaricaCfg(); toast('Impostazioni salvate', { tipo: 'ok' }); }
    catch (e) { toast(e.message, { tipo: 'errore' }); }
  }

  return (
    <div className="pagina pagina--stretta">
      <header className="pagina__testa"><div><h1>Impostazioni</h1></div></header>

      <section className="riquadro">
        <header className="riquadro__testa"><h2><Globe size={18} /> Prenotazioni dal sito</h2></header>
        <fieldset disabled={!titolare}>
          <Interruttore attivo={f.conferma_automatica === '1'} onCambia={s('conferma_automatica')} etichetta="Conferma automatica"
            descrizione={f.conferma_automatica === '1' ? 'Le prenotazioni dal sito sono confermate subito.' : 'Ogni prenotazione dal sito resta “da confermare” finché non la accetti tu.'} />
          <div className="griglia-campi">
            <Campo etichetta="Preavviso minimo" aiuto="Quanto prima si può prenotare per oggi.">
              <select value={f.anticipo_minimo_ore} onChange={c('anticipo_minimo_ore')}>{[0, 1, 2, 3, 4, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h ? `${h} ${h === 1 ? 'ora' : 'ore'}` : 'Nessuno'}</option>)}</select>
            </Campo>
            <Campo etichetta="Prenotabile fino a" aiuto="Quanto avanti nel calendario.">
              <select value={f.giorni_prenotabili} onChange={c('giorni_prenotabili')}>{[14, 30, 45, 60, 90, 120, 180].map(d => <option key={d} value={d}>{d} giorni</option>)}</select>
            </Campo>
            <Campo etichetta="Orari proposti ogni">
              <select value={f.intervallo_slot} onChange={c('intervallo_slot')}>{[5, 10, 15, 20, 30, 60].map(m => <option key={m} value={m}>{m} minuti</option>)}</select>
            </Campo>
            <Campo etichetta="Annullamento online" aiuto="Dopo, la cliente deve chiamare.">
              <select value={f.annullamento_ore} onChange={c('annullamento_ore')}>{[0, 2, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h ? `fino a ${h} ore prima` : 'sempre'}</option>)}</select>
            </Campo>
          </div>
        </fieldset>
      </section>

      <section className="riquadro">
        <header className="riquadro__testa"><h2><MessageCircle size={18} /> Messaggi WhatsApp</h2></header>
        <p className="muto">Si aprono già scritti quando confermi o rifiuti. Puoi usare {'{nome}'}, {'{data}'}, {'{ora}'}, {'{sede}'}, {'{servizi}'} e {'{codice}'}.</p>
        <fieldset disabled={!titolare} className="griglia-campi">
          <Campo etichetta="Conferma" largo><textarea className="area" rows="3" value={f.messaggio_conferma || ''} onChange={c('messaggio_conferma')} /></Campo>
          <Campo etichetta="Rifiuto" largo><textarea className="area" rows="3" value={f.messaggio_rifiuto || ''} onChange={c('messaggio_rifiuto')} /></Campo>
        </fieldset>
      </section>

      <section className="riquadro">
        <header className="riquadro__testa"><h2><Palette size={18} /> Dati del sito</h2></header>
        <fieldset disabled={!titolare} className="griglia-campi">
          <Campo etichetta="Nome del salone"><input value={f.nome_salone || ''} onChange={c('nome_salone')} /></Campo>
          <Campo etichetta="Partita IVA"><input value={f.partita_iva || ''} onChange={c('partita_iva')} /></Campo>
          <Campo etichetta="Slogan" largo><input value={f.slogan || ''} onChange={c('slogan')} /></Campo>
          <Campo etichetta="Link Instagram"><input value={f.instagram || ''} onChange={c('instagram')} placeholder="https://instagram.com/…" /></Campo>
          <Campo etichetta="Link Facebook"><input value={f.facebook || ''} onChange={c('facebook')} placeholder="https://facebook.com/…" /></Campo>
        </fieldset>
      </section>

      {cambiate && titolare && <div className="barra-salva barra-salva--fissa"><span>Ci sono modifiche non salvate</span><button className="btn" onClick={() => setF(cfg.impostazioni)}>Annulla</button><button className="btn btn--primario" onClick={salva}>Salva</button></div>}

      <Notifiche />

      <section className="riquadro">
        <header className="riquadro__testa"><h2><Palette size={18} /> Aspetto</h2></header>
        <Segmenti valore={tema} onCambia={setTema} etichetta="Tema" opzioni={[['chiaro', 'Chiaro'], ['scuro', 'Scuro']]} />
      </section>

      <AppTelefono />
      <Password />
      {titolare && <Utenti io={utente} />}
    </div>
  );
}

function Notifiche() {
  const toast = useToast();
  const [suono, setSuono] = useState(localStorage.getItem('larosa-suono') !== '0');
  const [permesso, setPermesso] = useState('Notification' in window ? Notification.permission : 'non-supportato');
  const [push, setPush] = useState(null);
  const pushPossibile = !DEMO && !desktop && 'serviceWorker' in navigator && 'PushManager' in window && location.protocol === 'https:';

  useEffect(() => {
    if (!pushPossibile) return;
    navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => setPush(!!s)).catch(() => setPush(false));
  }, []);

  async function attivaPush() {
    try {
      const p = await Notification.requestPermission();
      setPermesso(p);
      if (p !== 'granted') return toast('Hai negato il permesso. Riattivalo dalle impostazioni del telefono o del browser.', { tipo: 'errore' });
      const { chiave } = await get('/admin/push/chiave');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8(chiave) });
      await post('/admin/push', sub.toJSON());
      setPush(true); toast('Notifiche attive su questo dispositivo', { tipo: 'ok' });
    } catch (e) { toast(`Non riesco ad attivare le notifiche: ${e.message}`, { tipo: 'errore' }); }
  }
  async function disattivaPush() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await api('/admin/push', { metodo: 'DELETE', corpo: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
    setPush(false);
  }

  return (
    <section className="riquadro">
      <header className="riquadro__testa"><h2><Bell size={18} /> Notifiche su questo dispositivo</h2></header>
      <Interruttore attivo={suono} onCambia={v => { setSuono(v); localStorage.setItem('larosa-suono', v ? '1' : '0'); }} etichetta="Suono per le nuove prenotazioni" descrizione="Mentre il gestionale è aperto." />
      {pushPossibile ? (
        <Interruttore attivo={!!push} onCambia={v => v ? attivaPush() : disattivaPush()} etichetta="Notifiche anche con l’app chiusa"
          descrizione="Ricevi un avviso sul telefono a ogni nuova prenotazione dal sito. Su iPhone funziona dopo aver aggiunto l’app alla schermata Home." />
      ) : desktop ? (
        <Interruttore attivo={permesso === 'granted'} onCambia={async v => v && setPermesso(await Notification.requestPermission())} etichetta="Notifiche di sistema" descrizione="L’app resta attiva nell’area di notifica anche quando chiudi la finestra." />
      ) : (
        <p className="muto">{DEMO ? 'Nella versione vera arrivano le notifiche sul telefono anche con l’app chiusa.' : 'Le notifiche con l’app chiusa funzionano quando il gestionale è aperto dall’indirizzo https del salone.'}</p>
      )}
    </section>
  );
}

function AppTelefono() {
  const indirizzo = `${server() || location.origin}/gestionale/`;
  return (
    <section className="riquadro">
      <header className="riquadro__testa"><h2><Smartphone size={18} /> App sul telefono e sul computer</h2></header>
      <div className="istruzioni">
        <div>
          <h3>iPhone</h3>
          <p>Apri <strong>{indirizzo}</strong> con Safari, tocca Condividi e poi “Aggiungi alla schermata Home”.</p>
        </div>
        <div>
          <h3>Android</h3>
          <p>Apri lo stesso indirizzo con Chrome, tocca i tre puntini e poi “Installa app”.</p>
        </div>
        <div>
          <h3><Monitor size={15} /> Computer</h3>
          <p>Installa l’app Larosa Gestionale per Windows, Mac o Linux.{desktop && ` Sei collegato a ${server().replace(/^https?:\/\//, '')}.`}</p>
          {desktop && <button className="link" onClick={() => { impostaServer(''); salvaToken(null); location.reload(); }}>Collega a un altro server</button>}
        </div>
      </div>
    </section>
  );
}

function Password() {
  const toast = useToast();
  const [f, setF] = useState({ attuale: '', nuova: '' });
  async function salva(e) {
    e.preventDefault();
    try { await post('/admin/password', f); setF({ attuale: '', nuova: '' }); toast('Password cambiata', { tipo: 'ok' }); }
    catch (err) { toast(err.message, { tipo: 'errore' }); }
  }
  return (
    <section className="riquadro">
      <header className="riquadro__testa"><h2><KeyRound size={18} /> La tua password</h2></header>
      <form className="riga riga--fondo" onSubmit={salva}>
        <Campo etichetta="Password attuale"><input type="password" autoComplete="current-password" value={f.attuale} onChange={e => setF(x => ({ ...x, attuale: e.target.value }))} /></Campo>
        <Campo etichetta="Nuova password"><input type="password" autoComplete="new-password" minLength={8} value={f.nuova} onChange={e => setF(x => ({ ...x, nuova: e.target.value }))} /></Campo>
        <button className="btn" disabled={!f.attuale || f.nuova.length < 8}>Cambia password</button>
      </form>
    </section>
  );
}

function Utenti({ io }) {
  const { cfg } = useApp();
  const toast = useToast();
  const chiedi = useConferma();
  const [lista, setLista] = useState([]);
  const [nuovo, setNuovo] = useState(null);
  const carica = () => get('/admin/utenti').then(setLista).catch(() => {});
  useEffect(() => { carica(); }, []);

  async function crea() {
    try { await post('/admin/utenti', nuovo); setNuovo(null); carica(); toast('Accesso creato. Comunica email e password alla persona.', { tipo: 'ok', durata: 7000 }); }
    catch (e) { toast(e.message, { tipo: 'errore' }); }
  }
  async function elimina(u) {
    if (!await chiedi({ titolo: `Togliere l’accesso a ${u.nome}?`, testo: 'Non potrà più entrare nel gestionale.', conferma: 'Togli accesso', pericolo: true })) return;
    await del(`/admin/utenti/${u.id}`); carica();
  }
  async function resetta(u) {
    const pw = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 8).toUpperCase();
    await patch(`/admin/utenti/${u.id}`, { password: pw });
    toast(`Nuova password per ${u.nome}: ${pw}`, { titolo: 'Password reimpostata', durata: 20000 });
  }

  return (
    <section className="riquadro">
      <header className="riquadro__testa"><h2><Users size={18} /> Chi può entrare</h2><button className="btn btn--p" onClick={() => setNuovo({ nome: '', email: '', password: '', ruolo: 'staff', staff_id: '' })}><Plus size={16} /> Aggiungi</button></header>
      <ul className="utenti">
        {lista.map(u => (
          <li key={u.id}>
            <span><strong>{u.nome}</strong><small>{u.email}</small></span>
            <span className={`stato ${u.ruolo === 'titolare' ? 'stato--fatta' : ''}`}>{u.ruolo === 'titolare' ? 'Titolare' : 'Staff'}</span>
            {u.id !== io.id && <><button className="link" onClick={() => resetta(u)}>Nuova password</button><button className="icona-btn icona-btn--p" onClick={() => elimina(u)} aria-label={`Togli accesso a ${u.nome}`}><Trash2 size={16} /></button></>}
          </li>
        ))}
      </ul>
      <p className="muto">Lo staff vede agenda, prenotazioni e clienti. Solo il titolare cambia listino, orari, impostazioni ed elimina dati.</p>
      <Modale aperta={!!nuovo} onChiudi={() => setNuovo(null)} titolo="Nuovo accesso"
        piedi={<><button className="btn" onClick={() => setNuovo(null)}>Annulla</button><button className="btn btn--primario" onClick={crea}>Crea accesso</button></>}>
        {nuovo && <div className="griglia-campi">
          <Campo etichetta="Nome"><input autoFocus value={nuovo.nome} onChange={e => setNuovo(x => ({ ...x, nome: e.target.value }))} /></Campo>
          <Campo etichetta="Email"><input type="email" value={nuovo.email} onChange={e => setNuovo(x => ({ ...x, email: e.target.value }))} /></Campo>
          <Campo etichetta="Password" aiuto="Almeno 8 caratteri."><input value={nuovo.password} onChange={e => setNuovo(x => ({ ...x, password: e.target.value }))} /></Campo>
          <Campo etichetta="Ruolo"><Segmenti valore={nuovo.ruolo} onCambia={v => setNuovo(x => ({ ...x, ruolo: v }))} etichetta="Ruolo" opzioni={[['staff', 'Staff'], ['titolare', 'Titolare']]} /></Campo>
          <Campo etichetta="È anche nello staff?"><select value={nuovo.staff_id} onChange={e => setNuovo(x => ({ ...x, staff_id: Number(e.target.value) || '' }))}><option value="">No</option>{cfg.staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
        </div>}
      </Modale>
    </section>
  );
}
