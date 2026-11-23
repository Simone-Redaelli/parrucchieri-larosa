import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff, MapPin } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, post, patch, del, dataCorta, oggi } from '../api.js';
import { Campo, Interruttore, useToast, useCarica, Vuoto } from '../ui.jsx';
import OrariSettimana from './Orari.jsx';

export default function Sedi() {
  const { cfg, titolare, versione } = useApp();
  const { dati: chiusure, ricarica } = useCarica(() => get('/admin/chiusure'), [versione]);
  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div><h1>Sedi e orari</h1><p className="pagina__sotto">Indirizzi, contatti e orari che vedono i clienti sul sito. Gli orari decidono quando si può prenotare.</p></div>
      </header>
      <div className="griglia-sedi">
        {cfg.sedi.map(s => <SchedaSede key={s.id} sede={s} sola={!titolare} />)}
      </div>
      <Chiusure chiusure={(chiusure || []).filter(c => !c.staff_id)} ricarica={ricarica} sola={!titolare} />
    </div>
  );
}

function SchedaSede({ sede, sola }) {
  const { ricaricaCfg } = useApp();
  const toast = useToast();
  const [f, setF] = useState(sede);
  useEffect(() => setF(sede), [sede]);
  const cambiata = JSON.stringify(f) !== JSON.stringify(sede);
  const c = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  async function salva() {
    try { await patch(`/admin/sedi/${sede.id}`, { nome: f.nome, indirizzo: f.indirizzo, cap: f.cap, citta: f.citta, telefono: f.telefono, telefono2: f.telefono2, whatsapp: f.whatsapp, email: f.email, orari: f.orari, attiva: f.attiva ? 1 : 0 }); await ricaricaCfg(); toast(`${f.nome} aggiornata`, { tipo: 'ok' }); }
    catch (e) { toast(e.message, { tipo: 'errore' }); }
  }
  return (
    <section className="riquadro scheda-sede">
      <header className="riquadro__testa"><h2><MapPin size={18} /> {sede.nome}</h2></header>
      <fieldset disabled={sola} className="griglia-campi">
        <Campo etichetta="Nome"><input value={f.nome || ''} onChange={c('nome')} /></Campo>
        <Campo etichetta="Indirizzo"><input value={f.indirizzo || ''} onChange={c('indirizzo')} /></Campo>
        <Campo etichetta="CAP"><input value={f.cap || ''} onChange={c('cap')} /></Campo>
        <Campo etichetta="Città"><input value={f.citta || ''} onChange={c('citta')} /></Campo>
        <Campo etichetta="Telefono"><input value={f.telefono || ''} onChange={c('telefono')} /></Campo>
        <Campo etichetta="Secondo telefono"><input value={f.telefono2 || ''} onChange={c('telefono2')} /></Campo>
        <Campo etichetta="WhatsApp" aiuto="Numero a cui i clienti scrivono dal sito."><input value={f.whatsapp || ''} onChange={c('whatsapp')} /></Campo>
        <Campo etichetta="Email"><input value={f.email || ''} onChange={c('email')} /></Campo>
      </fieldset>
      <h3 className="sottotitolo">Orari di apertura</h3>
      <OrariSettimana valore={f.orari} onCambia={o => setF(x => ({ ...x, orari: o }))} sola={sola} />
      {!sola && <Interruttore attivo={!!f.attiva} onCambia={v => setF(x => ({ ...x, attiva: v }))} etichetta="Sede attiva" descrizione="Se spenta, non compare sul sito." />}
      {cambiata && !sola && <div className="barra-salva"><span>Ci sono modifiche non salvate</span><button className="btn" onClick={() => setF(sede)}>Annulla</button><button className="btn btn--primario" onClick={salva}>Salva</button></div>}
    </section>
  );
}

function Chiusure({ chiusure, ricarica, sola }) {
  const { cfg } = useApp();
  const toast = useToast();
  const [n, setN] = useState({ sede_id: '', dal: oggi(), al: oggi(), motivo: '' });
  const future = chiusure.filter(c => c.al >= oggi()).sort((a, b) => a.dal.localeCompare(b.dal));
  async function aggiungi() {
    if (n.al < n.dal) return toast('La data di fine è prima di quella di inizio.', { tipo: 'errore' });
    await post('/admin/chiusure', { ...n, sede_id: Number(n.sede_id) || null }); ricarica(); toast('Chiusura aggiunta: quei giorni non sono più prenotabili', { tipo: 'ok' });
    setN(x => ({ ...x, motivo: '' }));
  }
  return (
    <section className="riquadro">
      <header className="riquadro__testa"><h2><CalendarOff size={18} /> Chiusure e festività</h2></header>
      {!future.length ? <Vuoto titolo="Nessuna chiusura in programma" testo="Aggiungi ferie del salone, ponti e festività: in quei giorni il sito non accetta prenotazioni." /> : (
        <ul className="assenze">
          {future.map(c => (
            <li key={c.id}><CalendarOff size={15} /> <strong>{dataCorta(c.dal)}{c.al !== c.dal && ` – ${dataCorta(c.al)}`}</strong> <span>{c.sede_id ? cfg.sedi.find(s => s.id === c.sede_id)?.nome : 'Tutte le sedi'}</span>{c.motivo && <small>{c.motivo}</small>}
              {!sola && <button className="icona-btn icona-btn--p" onClick={async () => { await del(`/admin/chiusure/${c.id}`); ricarica(); }} aria-label="Togli chiusura"><Trash2 size={15} /></button>}</li>
          ))}
        </ul>
      )}
      {!sola && (
        <div className="riga riga--fondo">
          <Campo etichetta="Sede"><select value={n.sede_id} onChange={e => setN(x => ({ ...x, sede_id: e.target.value }))}><option value="">Tutte</option>{cfg.sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
          <Campo etichetta="Dal"><input type="date" value={n.dal} onChange={e => setN(x => ({ ...x, dal: e.target.value, al: x.al < e.target.value ? e.target.value : x.al }))} /></Campo>
          <Campo etichetta="Al"><input type="date" value={n.al} min={n.dal} onChange={e => setN(x => ({ ...x, al: e.target.value }))} /></Campo>
          <Campo etichetta="Motivo"><input value={n.motivo} placeholder="Es. Ferie di agosto" onChange={e => setN(x => ({ ...x, motivo: e.target.value }))} /></Campo>
          <button className="btn" onClick={aggiungi}><Plus size={16} /> Aggiungi</button>
        </div>
      )}
    </section>
  );
}
