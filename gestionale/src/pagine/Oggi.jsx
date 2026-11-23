import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, Check, X, Inbox, Clock, Sparkles, CalendarDays, MessageCircle } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, oggi, dataLunga, dataCorta, euro, durata, nomeCompleto, relativo } from '../api.js';
import { useCarica, Rotella, Stato, Avatar, Vuoto } from '../ui.jsx';
import { useAzioni } from './DettaglioPrenotazione.jsx';

function saluto() {
  const h = new Date().getHours();
  return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
}

export default function Oggi() {
  const { utente, versione, apriPrenotazione, nuovaPrenotazione, cfg } = useApp();
  const { dati, carica, errore } = useCarica(() => get(`/admin/dashboard?data=${oggi()}`), [versione]);
  const azioni = useAzioni();

  if (!dati) return <div className="pagina">{errore ? <p className="errore">{errore}</p> : <Rotella />}</div>;
  const k = dati.kpi;
  const ora = new Date().getHours() * 60 + new Date().getMinutes();
  const prossimo = dati.appuntamenti.find(p => p.fine > ora && ['confermata', 'in_attesa'].includes(p.stato));
  const sede = id => cfg.sedi.find(s => s.id === id)?.nome;

  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div>
          <p className="pagina__sopra">{dataLunga(dati.oggi)}</p>
          <h1>{saluto()}, {utente.nome.split(' ')[0]}</h1>
        </div>
        <div className="pagina__azioni">
          <Link className="btn" to="/agenda"><CalendarDays size={18} /> Apri l’agenda</Link>
        </div>
      </header>

      <section className="kpi" aria-label="Numeri di oggi">
        <div className="kpi__voce kpi__voce--forte">
          <span>Appuntamenti oggi</span><strong>{k.oggi}</strong>
          <small>{prossimo ? `Prossimo alle ${prossimo.ora}: ${nomeCompleto(prossimo)}` : k.oggi ? 'Nessun altro appuntamento oggi' : 'Giornata libera'}</small>
        </div>
        <div className="kpi__voce"><span>Incassato oggi</span><strong>{euro(k.incasso_oggi)}</strong><small>Dagli appuntamenti completati</small></div>
        <div className="kpi__voce">
          <span>Agenda piena</span><strong>{k.occupazione}%</strong>
          <div className="kpi__barra" role="meter" aria-valuenow={k.occupazione} aria-valuemin="0" aria-valuemax="100" aria-label="Occupazione di oggi"><i style={{ width: `${Math.min(100, k.occupazione)}%` }} /></div>
        </div>
        <div className="kpi__voce"><span>Questo mese</span><strong>{euro(k.incasso_mese)}</strong><small>{k.mese} appuntamenti, {k.nuovi_clienti} clienti nuovi</small></div>
      </section>

      <div className="griglia-oggi">
        <section className="riquadro">
          <header className="riquadro__testa">
            <h2>Da confermare</h2>
            {dati.in_attesa.length > 0 && <span className="pallino pallino--grande">{dati.in_attesa.length}</span>}
          </header>
          {!dati.in_attesa.length ? (
            <Vuoto icona={Inbox} titolo="Nessuna richiesta in sospeso" testo="Le prenotazioni dal sito arrivano qui, con una notifica." />
          ) : (
            <ul className="richieste">
              {dati.in_attesa.slice(0, 8).map(p => (
                <li key={p.id} className="richiesta">
                  <button className="richiesta__corpo" onClick={() => apriPrenotazione(p.id)}>
                    <span className="richiesta__quando"><strong>{relativo(p.data)}</strong><span>{p.ora}</span></span>
                    <span className="richiesta__chi">
                      <strong>{nomeCompleto(p)}</strong>
                      <span>{p.servizi.map(s => s.nome).join(', ')}</span>
                      <small>{sede(p.sede_id)}{p.staff_nome ? `, con ${p.staff_nome}` : ''}</small>
                    </span>
                  </button>
                  <div className="richiesta__azioni">
                    <button className="btn btn--ok btn--p" onClick={() => azioni.conferma(p)}><Check size={16} /> Conferma</button>
                    <button className="icona-btn icona-btn--bordo" onClick={() => azioni.rifiuta(p)} aria-label={`Rifiuta la richiesta di ${nomeCompleto(p)}`}><X size={16} /></button>
                  </div>
                </li>
              ))}
              {dati.in_attesa.length > 8 && <li><Link to="/prenotazioni" className="link">Vedi tutte le {dati.in_attesa.length} richieste</Link></li>}
            </ul>
          )}
        </section>

        <section className="riquadro">
          <header className="riquadro__testa">
            <h2>La giornata</h2>
            <button className="btn btn--p" onClick={() => nuovaPrenotazione({ data: dati.oggi })}>Aggiungi</button>
          </header>
          {!dati.appuntamenti.length ? (
            <Vuoto icona={CalendarCheck2} titolo="Oggi non ci sono appuntamenti" testo="Aggiungine uno o controlla l’agenda dei prossimi giorni." />
          ) : (
            <ol className="giornata">
              {dati.appuntamenti.map(p => {
                const passato = p.fine <= ora;
                const ora_ = p.inizio <= ora && p.fine > ora;
                return (
                  <li key={p.id} className={`giornata__voce ${passato ? 'passato' : ''} ${ora_ ? 'adesso' : ''}`}>
                    <span className="giornata__ora">{p.ora}<small>{p.ora_fine}</small></span>
                    <button className="giornata__corpo" onClick={() => apriPrenotazione(p.id)} style={{ '--c': p.staff_colore }}>
                      <span className="giornata__chi"><strong>{nomeCompleto(p)}</strong><Stato stato={p.stato} /></span>
                      <span className="giornata__cosa">{p.servizi.map(s => s.nome).join(', ')}</span>
                      <span className="giornata__dove"><Avatar nome={p.staff_nome} colore={p.staff_colore} piccolo /> {p.staff_nome || 'Da assegnare'}, {sede(p.sede_id)}</span>
                    </button>
                    {p.stato === 'confermata' && p.inizio <= ora && (
                      <button className="btn btn--p" onClick={() => azioni.completa(p)}><Sparkles size={15} /> Completa</button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="griglia-stat">
        <section className="riquadro riquadro--largo">
          <header className="riquadro__testa"><h2>Appuntamenti degli ultimi 30 giorni</h2></header>
          <Barre dati={dati.andamento} />
        </section>
        <section className="riquadro">
          <header className="riquadro__testa"><h2>Servizi più richiesti</h2><small>30 giorni</small></header>
          {dati.top_servizi.length ? (
            <ul className="classifica">
              {dati.top_servizi.map(s => (
                <li key={s.nome}>
                  <span className="classifica__nome">{s.nome}</span>
                  <span className="classifica__barra"><i style={{ width: `${(s.n / dati.top_servizi[0].n) * 100}%` }} /></span>
                  <span className="classifica__n">{s.n}</span>
                </li>
              ))}
            </ul>
          ) : <Vuoto icona={Clock} titolo="Ancora nessun dato" testo="Appena completi i primi appuntamenti vedrai i servizi più richiesti." />}
        </section>
        <section className="riquadro">
          <header className="riquadro__testa"><h2>Staff</h2><small>30 giorni</small></header>
          <ul className="classifica classifica--staff">
            {dati.staff.map(s => (
              <li key={s.id}>
                <span className="classifica__nome"><Avatar nome={s.nome} colore={s.colore} piccolo /> {s.nome}</span>
                <span className="classifica__n">{s.n} app.</span>
                <span className="classifica__euro">{euro(s.incasso)}</span>
              </li>
            ))}
          </ul>
          {k.no_show_30 > 0 && <p className="nota"><MessageCircle size={14} /> {k.no_show_30} clienti non si sono presentati negli ultimi 30 giorni.</p>}
        </section>
      </div>
    </div>
  );
}

function Barre({ dati }) {
  const [sopra, setSopra] = useState(null);
  const max = Math.max(4, ...dati.map(d => d.n));
  const passo = max <= 8 ? 2 : max <= 20 ? 5 : 10;
  const tacche = [];
  for (let v = 0; v <= max; v += passo) tacche.push(v);
  const H = 180, W = 100 / dati.length;
  const oggi_ = oggi();
  const tot = dati.reduce((t, d) => t + d.n, 0);
  const incasso = dati.reduce((t, d) => t + d.incasso, 0);
  return (
    <div className="barre">
      <p className="barre__sintesi"><strong>{tot}</strong> appuntamenti, <strong>{euro(incasso)}</strong> di incasso stimato</p>
      <div className="barre__area" style={{ height: H }} onMouseLeave={() => setSopra(null)}>
        {tacche.map(v => <div key={v} className="barre__griglia" style={{ bottom: `${(v / max) * 100}%` }}><span>{v}</span></div>)}
        <div className="barre__colonne">
          {dati.map((d, i) => (
            <button key={d.data} className={`barre__col ${d.data === oggi_ ? 'oggi' : ''} ${sopra === i ? 'sopra' : ''}`} style={{ width: `${W}%` }}
              onMouseEnter={() => setSopra(i)} onFocus={() => setSopra(i)} onBlur={() => setSopra(null)}
              aria-label={`${dataLunga(d.data)}: ${d.n} appuntamenti, ${euro(d.incasso)}`}>
              <i style={{ height: `${(d.n / max) * 100}%` }} />
            </button>
          ))}
        </div>
        {sopra != null && (
          <div className="barre__tip" style={{ left: `${(sopra + 0.5) * W}%` }} role="tooltip">
            <strong>{dataCorta(dati[sopra].data)}</strong>
            <span>{dati[sopra].n} appuntamenti</span>
            <span>{euro(dati[sopra].incasso)}</span>
          </div>
        )}
      </div>
      <div className="barre__asse">
        <span>{dataCorta(dati[0].data)}</span><span>{dataCorta(dati[Math.floor(dati.length / 2)].data)}</span><span>oggi</span>
      </div>
    </div>
  );
}
