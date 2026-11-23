import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Download, Users } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, post, euro, dataCorta, nomeCompleto, server, token, relativo, DEMO } from '../api.js';
import { useCarica, Rotella, Vuoto, Segmenti, Modale, Campo, useToast, Avatar } from '../ui.jsx';

export default function Clienti() {
  const { titolare } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [cerca, setCerca] = useState('');
  const [q, setQ] = useState('');
  const [ordine, setOrdine] = useState('nome');
  const [nuovo, setNuovo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQ(cerca.trim()), 220); return () => clearTimeout(t); }, [cerca]);
  const { dati } = useCarica(() => get(`/admin/clienti?ordine=${ordine}${q ? `&q=${encodeURIComponent(q)}` : ''}`), [q, ordine]);

  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div><h1>Clienti</h1><p className="pagina__sotto">{dati ? `${dati.length} ${dati.length === 1 ? 'cliente' : 'clienti'}` : ' '}. Si aggiungono da soli quando prenotano dal sito.</p></div>
        <div className="pagina__azioni">
          {titolare && !DEMO && <a className="btn" href={`${server()}/api/admin/esporta/clienti.csv?token=${encodeURIComponent(token())}`}><Download size={17} /> Esporta Excel</a>}
          <button className="btn btn--primario" onClick={() => setNuovo(true)}><UserPlus size={17} /> Nuovo cliente</button>
        </div>
      </header>
      <div className="barra-filtri">
        <label className="input-icona input-icona--largo"><Search size={17} /><input type="search" placeholder="Cerca per nome, telefono o email" value={cerca} onChange={e => setCerca(e.target.value)} /></label>
        <Segmenti valore={ordine} onCambia={setOrdine} etichetta="Ordina" opzioni={[['nome', 'A–Z'], ['recenti', 'Nuovi'], ['speso', 'Più fedeli']]} />
      </div>
      {!dati ? <Rotella /> : !dati.length ? <Vuoto icona={Users} titolo="Nessun cliente trovato" testo={q ? 'Prova a cercare in un altro modo.' : 'I clienti compaiono qui alla prima prenotazione.'} /> : (
        <div className="tabella-wrap">
          <table className="tabella">
            <thead><tr><th>Cliente</th><th>Telefono</th><th className="num">Visite</th><th>Ultima visita</th><th>Prossimo</th><th className="num">Speso</th></tr></thead>
            <tbody>
              {dati.map(c => (
                <tr key={c.id} onClick={() => nav(`/clienti/${c.id}`)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav(`/clienti/${c.id}`)}>
                  <td><span className="cella-nome"><Avatar nome={nomeCompleto(c)} colore="#6B5B45" piccolo /><strong>{nomeCompleto(c)}</strong>{c.no_show > 0 && <span className="stato stato--no">{c.no_show} assenze</span>}</span></td>
                  <td>{c.telefono || '–'}</td>
                  <td className="num">{c.visite}</td>
                  <td>{c.ultima_visita ? dataCorta(c.ultima_visita) : '–'}</td>
                  <td>{c.prossima ? relativo(c.prossima) : '–'}</td>
                  <td className="num">{euro(c.speso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ModaleCliente aperta={nuovo} onChiudi={() => setNuovo(false)} onSalvato={c => { setNuovo(false); toast('Cliente aggiunto', { tipo: 'ok' }); nav(`/clienti/${c.id}`); }} />
    </div>
  );
}

export function ModaleCliente({ aperta, onChiudi, onSalvato, cliente, salva }) {
  const [f, setF] = useState({});
  const [errore, setErrore] = useState(null);
  useEffect(() => { if (aperta) { setF(cliente || { nome: '', cognome: '', telefono: '', email: '', compleanno: '', note: '', marketing: false }); setErrore(null); } }, [aperta]);
  const c = k => e => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  async function invia(e) {
    e?.preventDefault();
    try { onSalvato(salva ? await salva(f) : await post('/admin/clienti', f)); }
    catch (err) { setErrore(err.message); }
  }
  return (
    <Modale aperta={aperta} onChiudi={onChiudi} titolo={cliente ? 'Modifica cliente' : 'Nuovo cliente'}
      piedi={<><button className="btn" onClick={onChiudi}>Annulla</button><button className="btn btn--primario" onClick={invia} disabled={!f.nome?.trim()}>Salva</button></>}>
      <form className="griglia-campi" onSubmit={invia}>
        <Campo etichetta="Nome"><input autoFocus required value={f.nome || ''} onChange={c('nome')} /></Campo>
        <Campo etichetta="Cognome"><input value={f.cognome || ''} onChange={c('cognome')} /></Campo>
        <Campo etichetta="Cellulare"><input type="tel" value={f.telefono || ''} onChange={c('telefono')} /></Campo>
        <Campo etichetta="Email"><input type="email" value={f.email || ''} onChange={c('email')} /></Campo>
        <Campo etichetta="Compleanno"><input type="date" value={f.compleanno || ''} onChange={c('compleanno')} /></Campo>
        <Campo etichetta="Note" largo aiuto="Allergie a prodotti, preferenze, formula colore…"><textarea className="area" rows="3" value={f.note || ''} onChange={c('note')} /></Campo>
        <label className="spunta campo--largo"><input type="checkbox" checked={!!f.marketing} onChange={c('marketing')} /><span>Accetta di ricevere promozioni</span></label>
        {errore && <p className="errore campo--largo">{errore}</p>}
        <button hidden />
      </form>
    </Modale>
  );
}
