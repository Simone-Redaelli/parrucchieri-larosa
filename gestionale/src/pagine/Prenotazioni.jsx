import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Check, X, Inbox } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, oggi, piuGiorni, dataLunga, euro, nomeCompleto, ORIGINI } from '../api.js';
import { useCarica, Rotella, Stato, Avatar, Vuoto, Segmenti } from '../ui.jsx';
import { useAzioni } from './DettaglioPrenotazione.jsx';

const SCHEDE = {
  attesa: { nome: 'Da confermare', q: () => `stato=in_attesa&dal=${oggi()}` },
  prossime: { nome: 'Prossime', q: () => `stato=in_attesa,confermata&dal=${oggi()}` },
  passate: { nome: 'Passate', q: () => `al=${piuGiorni(oggi(), -1)}&stato=completata,confermata,no_show&ordine=desc&limite=400` },
  annullate: { nome: 'Annullate', q: () => `stato=cancellata,rifiutata,no_show&ordine=desc&limite=300` },
  recenti: { nome: 'Arrivate di recente', q: () => `ordine=recenti&limite=150` },
};

export default function Prenotazioni() {
  const { versione, apriPrenotazione, cfg } = useApp();
  const { id } = useParams();
  const nav = useNavigate();
  const [scheda, setScheda] = useState(() => sessionStorage.getItem('pren-scheda') || 'attesa');
  const [cerca, setCerca] = useState('');
  const [q, setQ] = useState('');
  const [sede, setSede] = useState(0);
  const azioni = useAzioni();

  useEffect(() => { if (id) { apriPrenotazione(Number(id)); nav('/prenotazioni', { replace: true }); } }, [id]);
  useEffect(() => { sessionStorage.setItem('pren-scheda', scheda); }, [scheda]);
  useEffect(() => { const t = setTimeout(() => setQ(cerca.trim()), 250); return () => clearTimeout(t); }, [cerca]);

  const { dati, errore } = useCarica(() => get(`/admin/prenotazioni?${SCHEDE[scheda].q()}${q ? `&q=${encodeURIComponent(q)}` : ''}${sede ? `&sede=${sede}` : ''}`), [scheda, q, sede, versione]);

  const gruppi = useMemo(() => {
    const m = new Map();
    for (const p of dati || []) {
      const k = scheda === 'recenti' ? p.creata_il.slice(0, 10) : p.data;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    }
    return [...m.entries()];
  }, [dati, scheda]);

  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div><h1>Prenotazioni</h1><p className="pagina__sotto">Conferma le richieste dal sito, cerca e gestisci tutti gli appuntamenti.</p></div>
      </header>
      <div className="barra-filtri">
        <div className="schede-filtro" role="tablist">
          {Object.entries(SCHEDE).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={scheda === k} className={scheda === k ? 'attiva' : ''} onClick={() => setScheda(k)}>{v.nome}</button>
          ))}
        </div>
        <div className="barra-filtri__destra">
          {cfg.sedi.length > 1 && <select className="select-piccolo" value={sede} onChange={e => setSede(Number(e.target.value))} aria-label="Sede"><option value={0}>Tutte le sedi</option>{cfg.sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>}
          <label className="input-icona"><Search size={17} /><input type="search" placeholder="Nome, telefono, codice, servizio" value={cerca} onChange={e => setCerca(e.target.value)} /></label>
        </div>
      </div>
      {errore && <p className="errore">{errore}</p>}
      {!dati ? <Rotella /> : !dati.length ? (
        <Vuoto icona={Inbox} titolo={scheda === 'attesa' ? 'Nessuna richiesta da confermare' : 'Nessuna prenotazione'} testo={q ? 'Prova con un’altra ricerca.' : scheda === 'attesa' ? 'Quando qualcuno prenota dal sito, la richiesta compare qui e ricevi una notifica.' : undefined} />
      ) : (
        <div className="elenco">
          {gruppi.map(([g, lista]) => (
            <section key={g} className="elenco__gruppo">
              <h2 className="elenco__data">{scheda === 'recenti' ? `Arrivate ${dataLunga(g)}` : dataLunga(g)}{g === oggi() && <span className="etichetta-oggi">oggi</span>}</h2>
              <ul>
                {lista.map(p => (
                  <li key={p.id} className={`riga-pren riga-pren--${p.stato}`}>
                    <button className="riga-pren__corpo" onClick={() => apriPrenotazione(p.id)}>
                      <span className="riga-pren__ora">{p.ora}<small>{p.ora_fine}</small></span>
                      <span className="riga-pren__chi"><strong>{nomeCompleto(p)}</strong><span>{p.servizi.map(s => s.nome).join(', ')}</span></span>
                      <span className="riga-pren__staff"><Avatar nome={p.staff_nome} colore={p.staff_colore} piccolo />{p.staff_nome}<small>{p.sede_nome}</small></span>
                      <span className="riga-pren__info"><Stato stato={p.stato} /><small>{scheda === 'recenti' ? dataLunga(p.data) + ' ' + p.ora : ORIGINI[p.origine]}</small></span>
                      <span className="riga-pren__euro">{euro(p.prezzo_finale ?? p.prezzo_stimato)}</span>
                    </button>
                    {p.stato === 'in_attesa' && (
                      <div className="riga-pren__azioni">
                        <button className="btn btn--ok btn--p" onClick={() => azioni.conferma(p)}><Check size={16} /> Conferma</button>
                        <button className="icona-btn icona-btn--bordo" onClick={() => azioni.rifiuta(p)} aria-label="Rifiuta"><X size={16} /></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
