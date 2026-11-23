import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Mail, Pencil, Trash2, CalendarPlus, Cake } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, patch, del, euro, dataLunga, dataCorta, nomeCompleto, telLink, waLink, apriEsterno, durata } from '../api.js';
import { useCarica, Rotella, Stato, Avatar, Vuoto, useToast, useConferma } from '../ui.jsx';
import { ModaleCliente } from './Clienti.jsx';

export default function Cliente() {
  const { id } = useParams();
  const { versione, apriPrenotazione, nuovaPrenotazione, titolare } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const chiedi = useConferma();
  const [modifica, setModifica] = useState(false);
  const { dati: c, errore, ricarica } = useCarica(() => get(`/admin/clienti/${id}`), [id, versione]);

  if (errore) return <div className="pagina"><p className="errore">{errore}</p></div>;
  if (!c) return <div className="pagina"><Rotella /></div>;

  const fatte = c.storico.filter(p => p.stato === 'completata');
  const speso = fatte.reduce((t, p) => t + (p.prezzo_finale ?? p.prezzo_stimato ?? 0), 0);
  const assenze = c.storico.filter(p => p.stato === 'no_show').length;
  const servizi = {};
  for (const p of fatte) for (const s of p.servizi) servizi[s.nome] = (servizi[s.nome] || 0) + 1;
  const preferiti = Object.entries(servizi).sort((a, b) => b[1] - a[1]).slice(0, 3);

  async function elimina() {
    if (!await chiedi({ titolo: `Eliminare ${nomeCompleto(c)}?`, testo: 'Le sue prenotazioni restano, ma senza cliente collegato.', conferma: 'Elimina', pericolo: true })) return;
    await del(`/admin/clienti/${c.id}`); toast('Cliente eliminato', { tipo: 'ok' }); nav('/clienti');
  }

  return (
    <div className="pagina">
      <Link to="/clienti" className="indietro"><ArrowLeft size={17} /> Clienti</Link>
      <header className="scheda-cliente">
        <Avatar nome={nomeCompleto(c)} colore="#6B5B45" />
        <div className="scheda-cliente__testi">
          <h1>{nomeCompleto(c)}</h1>
          <p>{[c.telefono, c.email].filter(Boolean).join(' · ') || 'Nessun contatto'}{c.compleanno && <span className="compleanno"><Cake size={14} /> {dataCorta(c.compleanno)}</span>}</p>
        </div>
        <div className="pagina__azioni">
          {c.telefono && <a className="btn" href={telLink(c.telefono)}><Phone size={17} /> Chiama</a>}
          {c.telefono && <button className="btn btn--wa" onClick={() => apriEsterno(waLink(c.telefono, `Ciao ${c.nome}! `))}><MessageCircle size={17} /> WhatsApp</button>}
          {c.email && <a className="btn" href={`mailto:${c.email}`}><Mail size={17} /> Email</a>}
          <button className="btn btn--primario" onClick={() => nuovaPrenotazione({ cliente: c })}><CalendarPlus size={17} /> Nuovo appuntamento</button>
        </div>
      </header>

      <section className="kpi kpi--piccolo">
        <div className="kpi__voce"><span>Visite</span><strong>{fatte.length}</strong></div>
        <div className="kpi__voce"><span>Speso in totale</span><strong>{euro(speso)}</strong></div>
        <div className="kpi__voce"><span>Spesa media</span><strong>{fatte.length ? euro(Math.round(speso / fatte.length)) : '–'}</strong></div>
        <div className="kpi__voce"><span>Non presentata</span><strong>{assenze}</strong></div>
      </section>

      <div className="griglia-cliente">
        <section className="riquadro">
          <header className="riquadro__testa"><h2>Storico</h2><small>{c.storico.length} prenotazioni</small></header>
          {!c.storico.length ? <Vuoto titolo="Ancora nessun appuntamento" /> : (
            <ul className="storico">
              {c.storico.map(p => (
                <li key={p.id}>
                  <button onClick={() => apriPrenotazione(p.id)}>
                    <span className="storico__data"><strong>{dataLunga(p.data)}</strong><small>{p.ora}, {durata(p.durata)}</small></span>
                    <span className="storico__cosa">{p.servizi.map(s => s.nome).join(', ')}<small><Avatar nome={p.staff_nome} colore={p.staff_colore} piccolo /> {p.staff_nome}, {p.sede_nome}</small></span>
                    <span className="storico__fine"><Stato stato={p.stato} /><strong>{euro(p.prezzo_finale ?? p.prezzo_stimato)}</strong></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="colonna">
          <section className="riquadro">
            <header className="riquadro__testa"><h2>Note</h2><button className="link" onClick={() => setModifica(true)}><Pencil size={14} /> Modifica</button></header>
            <p className={c.note ? 'testo-note' : 'muto'}>{c.note || 'Nessuna nota. Aggiungi formula colore, preferenze o allergie.'}</p>
          </section>
          {preferiti.length > 0 && (
            <section className="riquadro">
              <header className="riquadro__testa"><h2>Servizi preferiti</h2></header>
              <ul className="classifica">{preferiti.map(([n, v]) => <li key={n}><span className="classifica__nome">{n}</span><span className="classifica__n">{v} volte</span></li>)}</ul>
            </section>
          )}
          <section className="riquadro">
            <header className="riquadro__testa"><h2>Dati</h2></header>
            <dl className="dati">
              <div><dt>Cliente dal</dt><dd>{dataLunga(c.creato_il.slice(0, 10))}</dd></div>
              <div><dt>Promozioni</dt><dd>{c.marketing ? 'Sì, accetta' : 'No'}</dd></div>
            </dl>
            <div className="riga">
              <button className="btn btn--p" onClick={() => setModifica(true)}><Pencil size={15} /> Modifica dati</button>
              {titolare && <button className="icona-btn icona-btn--bordo" onClick={elimina} aria-label="Elimina cliente"><Trash2 size={16} /></button>}
            </div>
          </section>
        </aside>
      </div>
      <ModaleCliente aperta={modifica} cliente={c} onChiudi={() => setModifica(false)} salva={f => patch(`/admin/clienti/${c.id}`, f)} onSalvato={() => { setModifica(false); ricarica(); toast('Cliente aggiornato', { tipo: 'ok' }); }} />
    </div>
  );
}
