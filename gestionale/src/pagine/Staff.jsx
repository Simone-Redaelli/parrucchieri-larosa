import { useEffect, useState } from 'react';
import { Plus, Pencil, Plane, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, post, patch, del, dataCorta, oggi, durata } from '../api.js';
import { Modale, Campo, Interruttore, Avatar, useToast, useConferma, Vuoto, useCarica } from '../ui.jsx';
import OrariSettimana from './Orari.jsx';

const COLORI = ['#d4a017', '#c2577a', '#3f7cac', '#5c9e6e', '#8e5bb5', '#d9704a', '#2f8f8f', '#7a6a58'];

export default function Staff() {
  const { cfg, ricaricaCfg, titolare, versione } = useApp();
  const toast = useToast();
  const [modifica, setModifica] = useState(null);
  const { dati: chiusure, ricarica } = useCarica(() => get('/admin/chiusure'), [versione]);
  const sede = id => cfg.sedi.find(s => s.id === id)?.nome || 'Nessuna sede';

  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div><h1>Staff</h1><p className="pagina__sotto">Chi lavora, dove, con quali orari e servizi. Le ferie bloccano gli orari sul sito.</p></div>
        {titolare && <div className="pagina__azioni"><button className="btn btn--primario" onClick={() => setModifica({ nome: '', ruolo: 'Hair stylist', sede_id: cfg.sedi[0]?.id, colore: COLORI[cfg.staff.length % COLORI.length], prenotabile: 1, attivo: 1, orari: null, servizi: null })}><Plus size={17} /> Aggiungi</button></div>}
      </header>
      {!cfg.staff.length && <Vuoto icona={UserRound} titolo="Nessuno nello staff" testo="Aggiungi le persone del salone per ricevere prenotazioni." />}
      <div className="griglia-staff">
        {cfg.staff.map(s => {
          const ferie = (chiusure || []).filter(c => c.staff_id === s.id && c.al >= oggi());
          return (
            <article key={s.id} className={`carta-staff ${s.attivo ? '' : 'carta-staff--spenta'}`} style={{ '--c': s.colore }}>
              <div className="carta-staff__testa">
                <Avatar nome={s.nome} colore={s.colore} />
                <div><h2>{s.nome}</h2><p>{s.ruolo}, {sede(s.sede_id)}</p></div>
                {titolare && <button className="icona-btn" onClick={() => setModifica(s)} aria-label={`Modifica ${s.nome}`}><Pencil size={17} /></button>}
              </div>
              <ul className="carta-staff__info">
                <li>{s.attivo ? (s.prenotabile ? 'Prenotabile dal sito' : 'Solo dal gestionale') : 'Non attivo'}</li>
                <li>{s.orari ? 'Orari personalizzati' : 'Segue gli orari della sede'}</li>
                <li>{s.servizi?.length ? `${s.servizi.length} servizi abilitati` : 'Fa tutti i servizi'}</li>
              </ul>
              {ferie.length > 0 && <div className="carta-staff__ferie">{ferie.map(f => <span key={f.id}><Plane size={13} /> {dataCorta(f.dal)}{f.al !== f.dal && ` – ${dataCorta(f.al)}`}{f.motivo && `: ${f.motivo}`}</span>)}</div>}
            </article>
          );
        })}
      </div>
      <ModaleStaff persona={modifica} chiusure={chiusure || []} onChiudi={() => setModifica(null)} ricaricaChiusure={ricarica}
        onFatto={async msg => { setModifica(null); await ricaricaCfg(); toast(msg, { tipo: 'ok' }); }} />
    </div>
  );
}

function ModaleStaff({ persona, chiusure, onChiudi, onFatto, ricaricaChiusure }) {
  const { cfg } = useApp();
  const toast = useToast();
  const chiedi = useConferma();
  const [f, setF] = useState({});
  const [assenza, setAssenza] = useState({ dal: oggi(), al: oggi(), motivo: 'Ferie' });
  useEffect(() => { if (persona) setF({ ...persona }); }, [persona]);
  const nuovo = !persona?.id;
  const sedeOrari = cfg.sedi.find(s => s.id === Number(f.sede_id))?.orari;
  const c = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function salva() {
    if (!f.nome?.trim()) return toast('Scrivi il nome.', { tipo: 'errore' });
    const corpo = { nome: f.nome, ruolo: f.ruolo, bio: f.bio, sede_id: Number(f.sede_id) || null, colore: f.colore, prenotabile: f.prenotabile ? 1 : 0, attivo: f.attivo ? 1 : 0, orari: f.orari || null, servizi: f.servizi?.length ? f.servizi : null };
    try { nuovo ? await post('/admin/staff', { ...corpo, ordine: 99 }) : await patch(`/admin/staff/${persona.id}`, corpo); onFatto(nuovo ? 'Aggiunto allo staff' : 'Modifiche salvate'); }
    catch (e) { toast(e.message, { tipo: 'errore' }); }
  }
  async function elimina() {
    if (!await chiedi({ titolo: `Eliminare ${persona.nome}?`, testo: 'Le sue prenotazioni restano ma senza stylist. Se ha smesso di lavorare puoi anche solo disattivarlo.', conferma: 'Elimina', pericolo: true })) return;
    await del(`/admin/staff/${persona.id}`); onFatto('Eliminato dallo staff');
  }
  async function aggiungiAssenza() {
    if (assenza.al < assenza.dal) return toast('La data di fine è prima di quella di inizio.', { tipo: 'errore' });
    await post('/admin/chiusure', { staff_id: persona.id, ...assenza }); ricaricaChiusure(); toast('Assenza aggiunta', { tipo: 'ok' });
  }

  const sueAssenze = chiusure.filter(x => x.staff_id === persona?.id && x.al >= oggi());

  return (
    <Modale aperta={!!persona} onChiudi={onChiudi} titolo={nuovo ? 'Nuova persona' : `Modifica ${persona?.nome}`} larga
      piedi={<>{!nuovo && <button className="btn btn--rosso-linea spingi-sx" onClick={elimina}>Elimina</button>}<button className="btn" onClick={onChiudi}>Annulla</button><button className="btn btn--primario" onClick={salva}>Salva</button></>}>
      <div className="griglia-campi">
        <Campo etichetta="Nome"><input autoFocus value={f.nome || ''} onChange={c('nome')} /></Campo>
        <Campo etichetta="Ruolo"><input value={f.ruolo || ''} onChange={c('ruolo')} placeholder="Hair stylist, colorist…" /></Campo>
        <Campo etichetta="Sede"><select value={f.sede_id || ''} onChange={c('sede_id')}>{cfg.sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
        <Campo etichetta="Colore in agenda">
          <div className="colori">
            {COLORI.map(col => <button key={col} type="button" className={`colore ${f.colore === col ? 'on' : ''}`} style={{ background: col }} onClick={() => setF(x => ({ ...x, colore: col }))} aria-label={`Colore ${col}`} />)}
            <input type="color" value={f.colore || '#d4a017'} onChange={c('colore')} aria-label="Colore personalizzato" />
          </div>
        </Campo>
      </div>
      <Interruttore attivo={!!f.prenotabile} onCambia={v => setF(x => ({ ...x, prenotabile: v }))} etichetta="Prenotabile dal sito" descrizione="I clienti possono sceglierlo e vedere i suoi orari liberi." />
      <Interruttore attivo={!!f.attivo} onCambia={v => setF(x => ({ ...x, attivo: v }))} etichetta="Attivo" descrizione="Se spento non compare né in agenda né sul sito." />

      <h3 className="sottotitolo">Orari di lavoro</h3>
      <Interruttore attivo={!!f.orari} onCambia={v => setF(x => ({ ...x, orari: v ? (sedeOrari || {}) : null }))} etichetta="Orari diversi da quelli della sede" descrizione="Ad esempio part-time o giorno libero diverso." />
      {f.orari && <OrariSettimana valore={f.orari} onCambia={o => setF(x => ({ ...x, orari: o }))} />}

      <h3 className="sottotitolo">Servizi che fa</h3>
      <Interruttore attivo={!f.servizi?.length} onCambia={v => setF(x => ({ ...x, servizi: v ? null : cfg.servizi.map(s => s.id) }))} etichetta="Tutti i servizi" />
      {!!f.servizi?.length && (
        <div className="spunte spunte--colonne">
          {cfg.servizi.filter(s => s.attivo).map(s => (
            <label key={s.id} className="spunta"><input type="checkbox" checked={f.servizi.includes(s.id)} onChange={e => setF(x => ({ ...x, servizi: e.target.checked ? [...x.servizi, s.id] : x.servizi.filter(i => i !== s.id) }))} /><span>{s.nome} <small>{durata(s.durata)}</small></span></label>
          ))}
        </div>
      )}

      {!nuovo && <>
        <h3 className="sottotitolo">Ferie e assenze</h3>
        {sueAssenze.length > 0 && (
          <ul className="assenze">
            {sueAssenze.map(a => <li key={a.id}><Plane size={15} /> {dataCorta(a.dal)}{a.al !== a.dal && ` – ${dataCorta(a.al)}`} {a.motivo && <small>{a.motivo}</small>}<button className="icona-btn icona-btn--p" onClick={async () => { await del(`/admin/chiusure/${a.id}`); ricaricaChiusure(); }} aria-label="Togli assenza"><Trash2 size={15} /></button></li>)}
          </ul>
        )}
        <div className="riga riga--fondo">
          <Campo etichetta="Dal"><input type="date" value={assenza.dal} onChange={e => setAssenza(x => ({ ...x, dal: e.target.value, al: x.al < e.target.value ? e.target.value : x.al }))} /></Campo>
          <Campo etichetta="Al"><input type="date" value={assenza.al} min={assenza.dal} onChange={e => setAssenza(x => ({ ...x, al: e.target.value }))} /></Campo>
          <Campo etichetta="Motivo"><input value={assenza.motivo} onChange={e => setAssenza(x => ({ ...x, motivo: e.target.value }))} /></Campo>
          <button className="btn" onClick={aggiungiAssenza}><Plus size={16} /> Aggiungi</button>
        </div>
      </>}
    </Modale>
  );
}
