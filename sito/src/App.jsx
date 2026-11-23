import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Caricamento, Rosa, Scritta, LogoOro } from './Logo.jsx';
import { api, telLink, DEMO } from './api.js';
import Home from './pagine/Home.jsx';
import Prenota from './pagine/Prenota.jsx';
import Gestisci from './pagine/Gestisci.jsx';

const Ctx = createContext(null);
export const useSalone = () => useContext(Ctx);

function leggiCarrello() {
  try { return JSON.parse(sessionStorage.getItem('larosa-scelti') || '[]'); } catch { return []; }
}

export default function App() {
  const [info, setInfo] = useState(null);
  const [errore, setErrore] = useState(null);
  const [scelti, setScelti] = useState(leggiCarrello);
  const [intro, setIntro] = useState(true);
  const [pronto, setPronto] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let visto = false;
    try { visto = sessionStorage.getItem('larosa-intro') === '1'; sessionStorage.setItem('larosa-intro', '1'); } catch {}
    const minimo = new Promise(r => setTimeout(r, visto ? 900 : 2300));
    const dati = api('/info').then(setInfo).catch(e => setErrore(e.message));
    Promise.all([minimo, dati]).then(() => { setPronto(true); setTimeout(() => setIntro(false), 380); });
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = intro ? 'hidden' : '';
  }, [intro]);
  useEffect(() => { try { sessionStorage.setItem('larosa-scelti', JSON.stringify(scelti)); } catch {} }, [scelti]);
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    if (!loc.hash) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [loc.hash, info]);

  const valore = useMemo(() => ({
    info, scelti, introFinita: !intro,
    alterna: id => setScelti(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]),
    impostaScelti: setScelti,
  }), [info, scelti, intro]);

  const inPrenota = loc.pathname.startsWith('/prenota');

  return (
    <Ctx.Provider value={valore}>
      <AnimatePresence>{intro && <Caricamento key="carica" pronto={pronto} />}</AnimatePresence>
      <a className="salta" href="#contenuto">Vai al contenuto</a>
      {!inPrenota && <Barra />}
      <main id="contenuto">
        {errore && !info ? <ErroreCarico messaggio={errore} /> : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/prenota" element={<Prenota />} />
            <Route path="/prenotazione/:codice?" element={<Gestisci />} />
            <Route path="*" element={<NonTrovata />} />
          </Routes>
        )}
      </main>
      {!inPrenota && <Piede />}
      {DEMO && <p className="demo-pill" role="note">Versione dimostrativa: le prenotazioni non arrivano al salone</p>}
    </Ctx.Provider>
  );
}

function Barra() {
  const { scelti } = useSalone();
  const [aperto, setAperto] = useState(false);
  const [sopra, setSopra] = useState(true);
  const loc = useLocation();
  useEffect(() => {
    const f = () => setSopra(window.scrollY < 40);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => setAperto(false), [loc]);
  return (
    <header className={`barra ${sopra ? 'barra--sopra' : ''} ${aperto ? 'barra--aperta' : ''}`}>
      <div className="barra__dentro">
        <Link to="/" className="marchio" aria-label="Parrucchieri Larosa, home">
          <Rosa className="marchio__rosa" />
          <span className="marchio__testi">
            <Scritta className="marchio__scritta" />
            <span className="marchio__sotto">Parrucchieri a Torino</span>
          </span>
        </Link>
        <nav className="barra__menu" aria-label="Menu principale">
          <NavLink to="/#salone">Il salone</NavLink>
          <NavLink to="/#listino">Listino</NavLink>
          <NavLink to="/#sedi">Sedi e orari</NavLink>
          <NavLink to="/prenotazione">La mia prenotazione</NavLink>
        </nav>
        <Link to="/prenota" className="bottone bottone--scuro barra__cta">
          Prenota{scelti.length ? <span className="conta">{scelti.length}</span> : null}
        </Link>
        <button className="barra__hamburger" aria-label={aperto ? 'Chiudi menu' : 'Apri menu'} aria-expanded={aperto} onClick={() => setAperto(a => !a)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}

function Piede() {
  const { info } = useSalone();
  return (
    <footer className="piede">
      <div className="piede__dentro">
        <div className="piede__marchio">
          <LogoOro />
          <p>{info?.salone.slogan}</p>
        </div>
        {info?.sedi.map(s => (
          <div key={s.id} className="piede__col">
            <h3>{s.nome}</h3>
            <p>{s.indirizzo}<br />{s.cap} {s.citta}</p>
            <p><a href={telLink(s.telefono)}>{s.telefono}</a>{s.telefono2 && <><br /><a href={telLink(s.telefono2)}>{s.telefono2}</a></>}</p>
            <p><a href={`mailto:${s.email}`}>{s.email}</a></p>
          </div>
        ))}
        <div className="piede__col">
          <h3>Seguici</h3>
          <p>
            {info?.salone.instagram && <><a href={info.salone.instagram} target="_blank" rel="noreferrer">Instagram</a><br /></>}
            {info?.salone.facebook && <><a href={info.salone.facebook} target="_blank" rel="noreferrer">Facebook</a><br /></>}
            <Link to="/prenotazione">Gestisci una prenotazione</Link>
          </p>
        </div>
      </div>
      <div className="piede__fondo">
        <span>© {new Date().getFullYear()} {info?.salone.nome || 'Parrucchieri Larosa'}</span>
        <span>P. IVA {info?.salone.partita_iva}</span>
      </div>
    </footer>
  );
}

function ErroreCarico({ messaggio }) {
  return (
    <section className="vuoto">
      <h1>Il sito non riesce a caricare i dati</h1>
      <p>{messaggio} Ricarica la pagina tra qualche secondo. Se il problema continua, chiamaci al <a href="tel:+393517385605">351 738 5605</a>.</p>
      <button className="bottone bottone--scuro" onClick={() => location.reload()}>Ricarica la pagina</button>
    </section>
  );
}

function NonTrovata() {
  return (
    <section className="vuoto">
      <h1>Questa pagina non esiste</h1>
      <p>Forse il link è vecchio. Puoi tornare alla home o prenotare direttamente.</p>
      <div className="riga-bottoni"><Link className="bottone bottone--scuro" to="/prenota">Prenota online</Link><Link className="bottone" to="/">Torna alla home</Link></div>
    </section>
  );
}
