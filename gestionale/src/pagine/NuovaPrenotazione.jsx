import { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, post, oggi, durata, prezzoServizio, nomeCompleto, dataLunga } from '../api.js';
import { Modale, Campo, Interruttore, Segmenti, useToast } from '../ui.jsx';

export default function NuovaPrenotazione({ prefill, onChiudi, onCreata }) {
  const aperta = !!prefill;
  return (
    <Modale aperta={aperta} onChiudi={onChiudi} titolo="Nuovo appuntamento" larga>
      {aperta && <Modulo prefill={prefill} onCreata={onCreata} onChiudi={onChiudi} />}
    </Modale>
  );
}

function Modulo({ prefill, onCreata, onChiudi }) {
  const { cfg } = useApp();
  const toast = useToast();
  const sediAttive = cfg.sedi.filter(s => s.attiva);
  const staffIniziale = cfg.staff.find(s => s.id === prefill.staff_id);
  const [cliente, setCliente] = useState(prefill.cliente || null);
  const [nuovo, setNuovo] = useState({ nome: '', cognome: '', telefono: '' });
  const [modoNuovo, setModoNuovo] = useState(false);
  const [cerca, setCerca] = useState('');
  const [trovati, setTrovati] = useState([]);
  const [sedeId, setSedeId] = useState(prefill.sede_id || staffIniziale?.sede_id || sediAttive[0]?.id);
  const [staffId, setStaffId] = useState(prefill.staff_id || '');
  const [servizi, setServizi] = useState([]);
  const [filtroServ, setFiltroServ] = useState('');
  const [data, setData] = useState(prefill.data || oggi());
  const [ora, setOra] = useState(prefill.ora || '');
  const [forza, setForza] = useState(!!prefill.ora);
  const [slot, setSlot] = useState(null);
  const [origine, setOrigine] = useState('telefono');
  const [note, setNote] = useState('');
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    if (cerca.trim().length < 2) { setTrovati([]); return; }
    const t = setTimeout(() => get(`/admin/clienti?q=${encodeURIComponent(cerca.trim())}`).then(r => setTrovati(r.slice(0, 6))).catch(() => {}), 220);
    return () => clearTimeout(t);
  }, [cerca]);

  const durataTot = servizi.reduce((t, id) => t + (cfg.servizi.find(s => s.id === id)?.durata || 0), 0);
  const staffSede = cfg.staff.filter(s => s.attivo && s.sede_id === Number(sedeId));

  useEffect(() => {
    if (!durataTot || forza) { setSlot(null); return; }
    setSlot(undefined);
    get(`/admin/slot?sede=${sedeId}&data=${data}&durata=${durataTot}&staff=${staffId || ''}`).then(setSlot).catch(() => setSlot([]));
  }, [sedeId, data, staffId, durataTot, forza]);

  const categorie = useMemo(() => {
    const m = new Map();
    const q = filtroServ.trim().toLowerCase();
    for (const s of cfg.servizi.filter(s => s.attivo && (!q || s.nome.toLowerCase().includes(q)))) {
      if (!m.has(s.categoria)) m.set(s.categoria, []);
      m.get(s.categoria).push(s);
    }
    return [...m.entries()];
  }, [cfg, filtroServ]);

  const pronto = (cliente || (modoNuovo && nuovo.nome.trim())) && servizi.length && ora && (staffId || !forza);

  async function crea() {
    setInvio(true);
    try {
      const corpo = {
        sede_id: Number(sedeId), staff_id: staffId ? Number(staffId) : null, servizi, data, ora, forza, origine, note_interne: note,
        ...(cliente ? { cliente_id: cliente.id, nome: cliente.nome } : nuovo),
      };
      const p = await post('/admin/prenotazioni', corpo);
      toast(`${nomeCompleto(p)}, ${dataLunga(p.data)} ore ${p.ora}`, { titolo: 'Appuntamento creato', tipo: 'ok' });
      onCreata(p);
    } catch (e) { toast(e.message, { tipo: 'errore' }); }
    finally { setInvio(false); }
  }

  return (
    <div className="nuova">
      <section className="nuova__sez">
        <h3>Cliente</h3>
        {cliente ? (
          <div className="cliente-scelto">
            <span><strong>{nomeCompleto(cliente)}</strong><small>{cliente.telefono || 'senza telefono'}</small></span>
            <button className="icona-btn" onClick={() => setCliente(null)} aria-label="Cambia cliente"><X size={18} /></button>
          </div>
        ) : modoNuovo ? (
          <div className="griglia-campi">
            <Campo etichetta="Nome"><input autoFocus value={nuovo.nome} onChange={e => setNuovo(x => ({ ...x, nome: e.target.value }))} /></Campo>
            <Campo etichetta="Cognome"><input value={nuovo.cognome} onChange={e => setNuovo(x => ({ ...x, cognome: e.target.value }))} /></Campo>
            <Campo etichetta="Cellulare" aiuto="Serve per i messaggi WhatsApp"><input type="tel" value={nuovo.telefono} onChange={e => setNuovo(x => ({ ...x, telefono: e.target.value }))} /></Campo>
            <div className="campo campo--fondo"><button className="link" onClick={() => setModoNuovo(false)}>Cerca tra i clienti</button></div>
          </div>
        ) : (
          <div className="cerca-cliente">
            <label className="input-icona"><Search size={18} /><input autoFocus placeholder="Cerca per nome o telefono" value={cerca} onChange={e => setCerca(e.target.value)} /></label>
            {trovati.length > 0 && (
              <ul className="tendina">
                {trovati.map(c => <li key={c.id}><button onClick={() => setCliente(c)}><strong>{nomeCompleto(c)}</strong><span>{c.telefono}</span><small>{c.visite} visite</small></button></li>)}
              </ul>
            )}
            <button className="btn btn--p" onClick={() => { setModoNuovo(true); setNuovo(x => ({ ...x, [/^[\d+\s]+$/.test(cerca) ? 'telefono' : 'nome']: cerca })); }}><UserPlus size={16} /> Nuovo cliente</button>
          </div>
        )}
      </section>

      <section className="nuova__sez">
        <div className="nuova__testa-serv">
          <h3>Servizi {servizi.length > 0 && <small>{durata(durataTot)}</small>}</h3>
          <input className="input-piccolo" placeholder="Filtra…" value={filtroServ} onChange={e => setFiltroServ(e.target.value)} aria-label="Filtra servizi" />
        </div>
        <div className="chip-gruppi">
          {categorie.map(([c, l]) => (
            <div key={c} className="chip-gruppo">
              <span className="chip-gruppo__nome">{c}</span>
              <div className="chips">
                {l.map(s => {
                  const on = servizi.includes(s.id);
                  return <button key={s.id} className={`chip ${on ? 'chip--on' : ''}`} aria-pressed={on} onClick={() => setServizi(x => on ? x.filter(i => i !== s.id) : [...x, s.id])} title={`${durata(s.durata)}, ${prezzoServizio(s)}`}>{s.nome}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="nuova__sez">
        <h3>Quando e con chi</h3>
        <div className="griglia-campi">
          {sediAttive.length > 1 && <Campo etichetta="Sede"><select value={sedeId} onChange={e => { setSedeId(Number(e.target.value)); setStaffId(''); }}>{sediAttive.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>}
          <Campo etichetta="Stylist"><select value={staffId} onChange={e => setStaffId(Number(e.target.value) || '')}><option value="">Il primo libero</option>{staffSede.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
          <Campo etichetta="Giorno"><input type="date" value={data} onChange={e => setData(e.target.value)} /></Campo>
          {forza && <Campo etichetta="Ora"><input type="time" step="300" value={ora} onChange={e => setOra(e.target.value)} /></Campo>}
        </div>
        {!forza && (
          <div className="slot">
            {!servizi.length ? <p className="muto">Scegli i servizi per vedere gli orari liberi.</p>
              : slot === undefined ? <p className="muto">Cerco gli orari liberi…</p>
              : !slot?.length ? <p className="muto">Nessun orario libero in questo giorno. Prova un altro giorno o attiva “Orario a scelta”.</p>
              : <div className="slot__lista">{slot.map(s => <button key={s.ora} className={`slot__ora ${ora === s.ora ? 'on' : ''}`} onClick={() => setOra(s.ora)}>{s.ora}</button>)}</div>}
          </div>
        )}
        <Interruttore attivo={forza} onCambia={v => { setForza(v); setOra(''); }} etichetta="Orario a scelta" descrizione="Per inserirlo anche se l’orario risulta occupato o fuori turno." />
        {forza && !staffId && <p className="muto">Con l’orario a scelta indica anche lo stylist.</p>}
      </section>

      <section className="nuova__sez">
        <h3>Come è arrivata la richiesta</h3>
        <Segmenti valore={origine} onCambia={setOrigine} etichetta="Origine" opzioni={[['telefono', 'Telefono'], ['walkin', 'In salone'], ['gestionale', 'Altro']]} />
        <Campo etichetta="Note interne" largo><textarea className="area" rows="2" value={note} onChange={e => setNote(e.target.value)} /></Campo>
      </section>

      <div className="nuova__piedi">
        <button className="btn" onClick={onChiudi}>Annulla</button>
        <button className="btn btn--primario btn--grande" disabled={!pronto || invio} onClick={crea}>{invio ? 'Salvo…' : ora ? `Crea appuntamento alle ${ora}` : 'Crea appuntamento'}</button>
      </div>
    </div>
  );
}
