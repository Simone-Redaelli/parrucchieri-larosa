import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, durata, icsUrl, telLink, waLink, prezzo } from '../api.js';

const STATI = {
  in_attesa: ['In attesa di conferma', 'Il salone deve ancora confermare. Ti scriviamo su WhatsApp o ti chiamiamo.'],
  confermata: ['Confermata', 'Ti aspettiamo.'],
  completata: ['Completata', 'Grazie per essere venuta da noi.'],
  cancellata: ['Annullata', 'Questa prenotazione è stata annullata.'],
  rifiutata: ['Non disponibile', 'Per quell’orario non riuscivamo a riceverti. Prenota un altro orario o chiamaci.'],
  no_show: ['Appuntamento mancato', 'Risulta che non sei passata. Se è un errore, chiamaci.'],
};

export default function Gestisci() {
  const { codice } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(codice || '');
  const [p, setP] = useState(null);
  const [errore, setErrore] = useState(null);
  const [carica, setCarica] = useState(false);
  const [chiedi, setChiedi] = useState(false);
  const mie = (() => { try { return JSON.parse(localStorage.getItem('larosa-mie') || '[]'); } catch { return []; } })();

  useEffect(() => {
    if (!codice) { setP(null); return; }
    setCarica(true); setErrore(null);
    api(`/prenotazione/${encodeURIComponent(codice)}`).then(setP).catch(e => { setP(null); setErrore(e.message); }).finally(() => setCarica(false));
  }, [codice]);

  async function annulla() {
    setCarica(true); setErrore(null);
    try { setP(await api(`/prenotazione/${encodeURIComponent(p.codice)}/annulla`, { method: 'POST' })); setChiedi(false); }
    catch (e) { setErrore(e.message); }
    finally { setCarica(false); }
  }

  return (
    <section className="sezione gestisci">
      <h1 className="titolo-sezione">La tua prenotazione</h1>
      <form className="gestisci__cerca" onSubmit={e => { e.preventDefault(); const c = input.trim().toUpperCase(); if (c) nav(`/prenotazione/${c.startsWith('LR-') ? c : 'LR-' + c}`); }}>
        <label><span>Codice prenotazione</span><input value={input} onChange={e => setInput(e.target.value)} placeholder="LR-XXXXXXXX" autoCapitalize="characters" /></label>
        <button className="bottone bottone--scuro">Cerca</button>
      </form>
      {!codice && mie.length > 0 && (
        <div className="gestisci__mie">
          <p>Prenotazioni fatte da questo dispositivo:</p>
          <div className="riga-bottoni">{mie.map(c => <Link key={c} className="bottone bottone--linea" to={`/prenotazione/${c}`}>{c}</Link>)}</div>
        </div>
      )}
      {carica && !p && <p className="caricamento">Cerco la prenotazione…</p>}
      {errore && <p className="avviso" role="alert">{errore}</p>}
      {p && (
        <article className={`scheda-pren scheda-pren--${p.stato}`}>
          <div className="scheda-pren__stato"><strong>{STATI[p.stato]?.[0]}</strong><span>{STATI[p.stato]?.[1]}</span></div>
          <p className="scheda-pren__quando">{p.data_estesa}, ore {p.ora}</p>
          <ul className="scheda-pren__servizi">
            {p.servizi.map(s => <li key={s.nome}><span>{s.nome}</span><span>{prezzo(s)}</span></li>)}
          </ul>
          <p className="scheda-pren__meta">{durata(p.durata)}{p.staff ? `, con ${p.staff}` : ''}. {p.sede.nome}, {p.sede.indirizzo}.</p>
          <div className="riga-bottoni">
            {['in_attesa', 'confermata'].includes(p.stato) && <a className="bottone bottone--scuro" href={icsUrl(p.codice)}>Aggiungi al calendario</a>}
            <a className="bottone bottone--linea" href={waLink(p.sede.whatsapp, `Ciao! Ho la prenotazione ${p.codice} per ${p.data_estesa} alle ${p.ora}.`)} target="_blank" rel="noreferrer">Scrivici su WhatsApp</a>
            <a className="bottone bottone--linea" href={telLink(p.sede.telefono)}>Chiama {p.sede.nome}</a>
          </div>
          {p.annullabile && !chiedi && <button className="link link--rosso" onClick={() => setChiedi(true)}>Annulla la prenotazione</button>}
          {chiedi && (
            <div className="scheda-pren__conferma" role="alertdialog" aria-label="Conferma annullamento">
              <p>Vuoi davvero annullare l’appuntamento di {p.data_estesa} alle {p.ora}?</p>
              <div className="riga-bottoni">
                <button className="bottone bottone--rosso" onClick={annulla} disabled={carica}>Sì, annulla</button>
                <button className="bottone bottone--linea" onClick={() => setChiedi(false)}>No, la tengo</button>
              </div>
            </div>
          )}
          {['in_attesa', 'confermata'].includes(p.stato) && !p.annullabile && <p className="scheda-pren__nota">Manca poco all’appuntamento: per annullare chiama il salone.</p>}
          {['cancellata', 'rifiutata'].includes(p.stato) && <Link className="bottone bottone--giallo" to="/prenota">Prenota un altro orario</Link>}
        </article>
      )}
    </section>
  );
}
