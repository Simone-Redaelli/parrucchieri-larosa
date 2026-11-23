import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Inbox, Users, Scissors, UserRound, MapPin, Settings, Plus, LogOut, Moon, Sun, Menu, Bell } from 'lucide-react';
import { get, salvaToken, token, quandoScade, server, desktop, dataLunga, oggi, nomeCompleto, DEMO } from './api.js';
import { suEvento, avviaSimulazione, ricominciaDemo } from './demo.js';
import { Rosa, Toasts, useToast, Conferme, Rotella } from './ui.jsx';
import Accesso from './pagine/Accesso.jsx';
import Oggi from './pagine/Oggi.jsx';
import Agenda from './pagine/Agenda.jsx';
import Prenotazioni from './pagine/Prenotazioni.jsx';
import Clienti from './pagine/Clienti.jsx';
import Cliente from './pagine/Cliente.jsx';
import Listino from './pagine/Listino.jsx';
import Staff from './pagine/Staff.jsx';
import Sedi from './pagine/Sedi.jsx';
import Impostazioni from './pagine/Impostazioni.jsx';
import DettaglioPrenotazione from './pagine/DettaglioPrenotazione.jsx';
import NuovaPrenotazione from './pagine/NuovaPrenotazione.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function App() {
  const [utente, setUtente] = useState(null);
  const [verificato, setVerificato] = useState(false);
  const [tema, setTema] = useState(() => localStorage.getItem('larosa-tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'));

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem('larosa-tema', tema);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', tema === 'scuro' ? '#0C0A09' : '#0F0D0B');
  }, [tema]);

  useEffect(() => {
    quandoScade(() => { salvaToken(null); setUtente(null); });
    if (!token()) { setVerificato(true); return; }
    get('/admin/me').then(setUtente).catch(() => {}).finally(() => setVerificato(true));
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !desktop && !DEMO) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }, []);

  if (!verificato) return <div className="schermo-carica"><Rosa className="schermo-carica__rosa" oro /></div>;
  return (
    <Toasts>
      <Conferme>
        {utente
          ? <Guscio utente={utente} esci={() => { salvaToken(null); setUtente(null); }} tema={tema} setTema={setTema} />
          : <Accesso onEntra={(t, u) => { salvaToken(t); setUtente(u); }} />}
      </Conferme>
    </Toasts>
  );
}

function suono() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0], [1318.5, 0.12], [1760, 0.24]].forEach(([f, t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.5);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.55);
    });
  } catch {}
}

function Guscio({ utente, esci, tema, setTema }) {
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [cfg, setCfg] = useState(null);
  const [versione, setVersione] = useState(0);
  const [aperta, setAperta] = useState(null);
  const [nuova, setNuova] = useState(null);
  const [richieste, setRichieste] = useState(0);
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState(true);
  const cfgRef = useRef(null);

  const caricaCfg = useCallback(async () => {
    const [sedi, staff, servizi, impostazioni] = await Promise.all([get('/admin/sedi'), get('/admin/staff'), get('/admin/servizi'), get('/admin/impostazioni')]);
    const c = { sedi, staff, servizi, impostazioni };
    cfgRef.current = c; setCfg(c);
  }, []);
  const contaRichieste = useCallback(() => {
    get(`/admin/prenotazioni?stato=in_attesa&dal=${oggi()}`).then(l => {
      setRichieste(l.length);
      window.larosaDesktop?.badge?.(l.length);
    }).catch(() => {});
  }, []);

  useEffect(() => { caricaCfg().catch(e => toast(e.message, { tipo: 'errore' })); contaRichieste(); }, []);
  useEffect(() => setMenu(false), [loc.pathname]);

  useEffect(() => {
    const gestisci = (tipo, d) => {
      if (tipo === 'config') { caricaCfg().catch(() => {}); return; }
      setVersione(v => v + 1);
      contaRichieste();
      if (d.tipo === 'nuova' && d.da !== utente.nome) {
        const p = d.prenotazione;
        const titolo = p.stato === 'in_attesa' ? 'Nuova richiesta dal sito' : 'Nuova prenotazione';
        const testo = `${nomeCompleto(p)} · ${dataLunga(p.data)} ore ${p.ora}`;
        if (localStorage.getItem('larosa-suono') !== '0') suono();
        toast(testo, { titolo, tipo: 'nuova', durata: 9000, azione: { testo: 'Apri', fn: () => setAperta(p.id) } });
        if (!DEMO && 'Notification' in window && Notification.permission === 'granted' && (document.hidden || desktop)) {
          const n = new Notification(titolo, { body: testo + `\n${p.servizi.map(s => s.nome).join(', ')}`, tag: p.codice, icon: 'icona-192.png' });
          n.onclick = () => { window.focus(); window.larosaDesktop?.mostra?.(); setAperta(p.id); };
        }
      }
      if (d.tipo === 'aggiornata' && d.da === 'cliente') toast(`${nomeCompleto(d.prenotazione)} ha annullato l'appuntamento di ${dataLunga(d.prenotazione.data)}`, { titolo: 'Annullamento', tipo: 'avviso', durata: 9000 });
    };
    if (DEMO) {
      const stop = suEvento(gestisci);
      avviaSimulazione();
      return stop;
    }
    let es, timer, chiuso = false;
    const apri = () => {
      es = new EventSource(`${server()}/api/admin/eventi?token=${encodeURIComponent(token())}`);
      es.addEventListener('ciao', () => setOnline(true));
      es.addEventListener('prenotazione', e => gestisci('prenotazione', JSON.parse(e.data)));
      es.addEventListener('config', () => gestisci('config'));
      es.onerror = () => {
        setOnline(false); es.close();
        if (!chiuso) timer = setTimeout(apri, 4000);
      };
    };
    apri();
    return () => { chiuso = true; clearTimeout(timer); es?.close(); };
  }, []);

  const valore = useMemo(() => ({
    utente, cfg, versione, titolare: utente.ruolo === 'titolare',
    aggiorna: () => setVersione(v => v + 1),
    ricaricaCfg: caricaCfg,
    apriPrenotazione: id => setAperta(id),
    nuovaPrenotazione: (prefill = {}) => setNuova(prefill),
    contaRichieste,
  }), [utente, cfg, versione]);

  if (!cfg) return <div className="schermo-carica"><Rosa className="schermo-carica__rosa" oro /><Rotella testo="Preparo il gestionale…" /></div>;

  const voci = [
    ['/', 'Oggi', LayoutDashboard],
    ['/agenda', 'Agenda', CalendarDays],
    ['/prenotazioni', 'Prenotazioni', Inbox, richieste],
    ['/clienti', 'Clienti', Users],
    ['/listino', 'Listino', Scissors],
    ['/staff', 'Staff', UserRound],
    ['/sedi', 'Sedi e orari', MapPin],
    ['/impostazioni', 'Impostazioni', Settings],
  ];

  return (
    <Ctx.Provider value={valore}>
      <div className={`app ${menu ? 'app--menu' : ''}`}>
        <aside className="lato">
          <div className="lato__marchio">
            <Rosa className="lato__rosa" oro />
            <div><strong>Larosa</strong><span>Gestionale</span></div>
          </div>
          <button className="btn btn--oro lato__nuova" onClick={() => setNuova({})}><Plus size={18} /> Nuovo appuntamento</button>
          <nav className="lato__nav" aria-label="Sezioni">
            {voci.map(([to, t, I, n]) => (
              <NavLink key={to} to={to} end={to === '/'} className="lato__voce">
                <I size={19} /><span>{t}</span>{n > 0 && <span className="pallino">{n}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="lato__fondo">
            {DEMO && (
              <div className="demo-nota">
                <strong>Versione demo</strong>
                <span>Dati finti. Le prenotazioni fatte sul sito demo, nello stesso browser, arrivano qui in tempo reale.</span>
                <button className="link" onClick={() => { ricominciaDemo(); location.reload(); }}>Ricomincia da capo</button>
              </div>
            )}
            <div className={`connessione ${online ? '' : 'connessione--off'}`} title={online ? 'Aggiornamenti in tempo reale attivi' : 'Riconnessione in corso'}>
              <i />{online ? 'In tempo reale' : 'Riconnessione…'}
            </div>
            <div className="lato__utente">
              <span className="avatar avatar--p" style={{ '--c': '#4A3F33' }}>{utente.nome.slice(0, 1).toUpperCase()}</span>
              <div><strong>{utente.nome}</strong><span>{utente.ruolo === 'titolare' ? 'Titolare' : 'Staff'}</span></div>
              <button className="icona-btn icona-btn--chiaro" onClick={() => setTema(tema === 'scuro' ? 'chiaro' : 'scuro')} aria-label={tema === 'scuro' ? 'Tema chiaro' : 'Tema scuro'}>{tema === 'scuro' ? <Sun size={18} /> : <Moon size={18} />}</button>
              <button className="icona-btn icona-btn--chiaro" onClick={esci} aria-label="Esci"><LogOut size={18} /></button>
            </div>
          </div>
        </aside>
        <div className="velo-menu" onClick={() => setMenu(false)} />

        <header className="testata-mobile">
          <button className="icona-btn" onClick={() => setMenu(true)} aria-label="Apri menu"><Menu size={22} /></button>
          <div className="testata-mobile__marchio"><Rosa className="testata-mobile__rosa" oro /><strong>Larosa</strong></div>
          <button className="icona-btn" onClick={() => nav('/prenotazioni')} aria-label={`Richieste da confermare: ${richieste}`}><Bell size={21} />{richieste > 0 && <span className="pallino pallino--su">{richieste}</span>}</button>
        </header>

        <main className="contenuto">
          <Routes>
            <Route path="/" element={<Oggi />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/prenotazioni" element={<Prenotazioni />} />
            <Route path="/prenotazioni/:id" element={<Prenotazioni />} />
            <Route path="/clienti" element={<Clienti />} />
            <Route path="/clienti/:id" element={<Cliente />} />
            <Route path="/listino" element={<Listino />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/sedi" element={<Sedi />} />
            <Route path="/impostazioni" element={<Impostazioni tema={tema} setTema={setTema} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <nav className="schede" aria-label="Sezioni principali">
          <NavLink to="/" end><LayoutDashboard size={21} /><span>Oggi</span></NavLink>
          <NavLink to="/agenda"><CalendarDays size={21} /><span>Agenda</span></NavLink>
          <button className="schede__piu" onClick={() => setNuova({})} aria-label="Nuovo appuntamento"><Plus size={26} /></button>
          <NavLink to="/prenotazioni"><Inbox size={21} /><span>Richieste</span>{richieste > 0 && <span className="pallino pallino--su">{richieste}</span>}</NavLink>
          <NavLink to="/clienti"><Users size={21} /><span>Clienti</span></NavLink>
        </nav>
      </div>
      <DettaglioPrenotazione id={aperta} onChiudi={() => setAperta(null)} />
      <NuovaPrenotazione prefill={nuova} onChiudi={() => setNuova(null)} onCreata={p => { setNuova(null); setVersione(v => v + 1); setAperta(p.id); }} />
    </Ctx.Provider>
  );
}
