import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Mail, CalendarClock, Check, X, Sparkles, UserX, Ban, RotateCcw, Trash2, Pencil, StickyNote, User } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, patch, del, dataLunga, durata, euro, nomeCompleto, telLink, waLink, apriEsterno, ORIGINI, prezzoServizio, fmt } from '../api.js';
import { Pannello, Stato, Rotella, useToast, useConferma, Avatar, Campo, Interruttore } from '../ui.jsx';

export function useAzioni() {
  const { aggiorna, contaRichieste } = useApp();
  const toast = useToast();
  const chiedi = useConferma();

  const cambia = async (p, corpo, messaggio, wa) => {
    try {
      const n = await patch(`/admin/prenotazioni/${p.id}`, corpo);
      aggiorna(); contaRichieste();
      let azione;
      if (wa && n.cliente_telefono) {
        const det = await get(`/admin/prenotazioni/${p.id}`);
        azione = { testo: 'Avvisa su WhatsApp', fn: () => apriEsterno(waLink(det.cliente_telefono, det[wa])) };
      }
      toast(messaggio, { tipo: 'ok', azione, durata: azione ? 10000 : 4000 });
      return n;
    } catch (e) { toast(e.message, { tipo: 'errore' }); }
  };

  return {
    conferma: p => cambia(p, { stato: 'confermata' }, `Confermata: ${nomeCompleto(p)}, ${dataLunga(p.data)} ore ${p.ora}`, 'whatsapp_conferma'),
    rifiuta: async p => {
      if (!await chiedi({ titolo: 'Rifiutare la richiesta?', testo: `${nomeCompleto(p)} non avrà l’appuntamento di ${dataLunga(p.data)} alle ${p.ora}. Dopo puoi avvisarla su WhatsApp.`, conferma: 'Rifiuta', pericolo: true })) return;
      return cambia(p, { stato: 'rifiutata' }, `Richiesta di ${nomeCompleto(p)} rifiutata`, 'whatsapp_rifiuto');
    },
    completa: p => cambia(p, { stato: 'completata', prezzo_finale: p.prezzo_finale ?? p.prezzo_stimato }, `Completato: ${nomeCompleto(p)}, ${euro(p.prezzo_finale ?? p.prezzo_stimato)}`),
    noShow: p => cambia(p, { stato: 'no_show' }, `${nomeCompleto(p)} segnata come non presentata`),
    annulla: async p => {
      if (!await chiedi({ titolo: 'Annullare l’appuntamento?', testo: `L’orario di ${dataLunga(p.data)} alle ${p.ora} torna libero sul sito.`, conferma: 'Annulla appuntamento', annulla: 'Indietro', pericolo: true })) return;
      return cambia(p, { stato: 'cancellata' }, 'Appuntamento annullato');
    },
    riapri: p => cambia(p, { stato: 'confermata' }, 'Appuntamento riaperto come confermato'),
  };
}

export default function DettaglioPrenotazione({ id, onChiudi }) {
  const { versione, cfg, aggiorna, titolare } = useApp();
  const [p, setP] = useState(null);
  const [modifica, setModifica] = useState(false);
  const azioni = useAzioni();
  const toast = useToast();
  const chiedi = useConferma();
  const nav = useNavigate();

  const ricarica = () => id && get(`/admin/prenotazioni/${id}`).then(setP).catch(e => { toast(e.message, { tipo: 'errore' }); onChiudi(); });
  useEffect(() => { setP(null); setModifica(false); ricarica(); }, [id]);
  useEffect(() => { if (id && p) ricarica(); }, [versione]);

  const esegui = async f => { await f(p); ricarica(); };
  const salva = async corpo => {
    try { await patch(`/admin/prenotazioni/${p.id}`, corpo); aggiorna(); ricarica(); toast('Salvato', { tipo: 'ok', durata: 2000 }); return true; }
    catch (e) { toast(e.message, { tipo: 'errore' }); return false; }
  };
  const elimina = async () => {
    if (!await chiedi({ titolo: 'Eliminare la prenotazione?', testo: 'Sparisce anche dallo storico del cliente. Per liberare l’orario di solito basta annullarla.', conferma: 'Elimina per sempre', pericolo: true })) return;
    await del(`/admin/prenotazioni/${p.id}`); aggiorna(); onChiudi(); toast('Prenotazione eliminata', { tipo: 'ok' });
  };

  const piedi = p && (
    <div className="azioni-pren">
      {p.stato === 'in_attesa' && <>
        <button className="btn btn--ok" onClick={() => esegui(azioni.conferma)}><Check size={18} /> Conferma</button>
        <button className="btn btn--rosso-linea" onClick={() => esegui(azioni.rifiuta)}><X size={18} /> Rifiuta</button>
      </>}
      {p.stato === 'confermata' && <>
        <button className="btn btn--primario" onClick={() => esegui(azioni.completa)}><Sparkles size={18} /> Completa</button>
        <button className="btn" onClick={() => esegui(azioni.noShow)}><UserX size={18} /> Non è venuta</button>
        <button className="btn btn--rosso-linea" onClick={() => esegui(azioni.annulla)}><Ban size={18} /> Annulla</button>
      </>}
      {['completata', 'cancellata', 'rifiutata', 'no_show'].includes(p.stato) && <button className="btn" onClick={() => esegui(azioni.riapri)}><RotateCcw size={18} /> Riapri</button>}
      {titolare && <button className="icona-btn icona-btn--bordo azioni-pren__elimina" onClick={elimina} aria-label="Elimina prenotazione"><Trash2 size={18} /></button>}
    </div>
  );

  return (
    <Pannello aperto={!!id} onChiudi={onChiudi} titolo={p ? nomeCompleto(p) : 'Prenotazione'} piedi={piedi}>
      {!p ? <Rotella /> : (
        <div className="dettaglio">
          <div className="dettaglio__stato">
            <Stato stato={p.stato} />
            <span className="dettaglio__codice">{p.codice}</span>
            <span className="dettaglio__origine">da {ORIGINI[p.origine] || p.origine}</span>
          </div>

          <div className="contatti">
            {p.cliente_telefono && <a className="btn btn--p" href={telLink(p.cliente_telefono)}><Phone size={16} /> Chiama</a>}
            {p.cliente_telefono && <button className="btn btn--p btn--wa" onClick={() => apriEsterno(waLink(p.cliente_telefono))}><MessageCircle size={16} /> WhatsApp</button>}
            {p.cliente_email && <a className="btn btn--p" href={`mailto:${p.cliente_email}`}><Mail size={16} /> Email</a>}
            {p.cliente_id && <button className="btn btn--p" onClick={() => { onChiudi(); nav(`/clienti/${p.cliente_id}`); }}><User size={16} /> Scheda cliente</button>}
          </div>

          {p.stato === 'in_attesa' && p.cliente_telefono && (
            <div className="suggerimento">
              <p>Dopo aver confermato o rifiutato puoi mandarle il messaggio già pronto.</p>
              <div className="riga">
                <button className="link" onClick={() => apriEsterno(waLink(p.cliente_telefono, p.whatsapp_conferma))}>Messaggio di conferma</button>
                <button className="link" onClick={() => apriEsterno(waLink(p.cliente_telefono, p.whatsapp_rifiuto))}>Messaggio di rifiuto</button>
              </div>
            </div>
          )}

          {modifica ? <Sposta p={p} cfg={cfg} onFatto={async c => { if (await salva(c)) setModifica(false); }} onAnnulla={() => setModifica(false)} /> : (
            <section className="blocco">
              <header className="blocco__testa"><h3><CalendarClock size={17} /> Quando</h3>{!['cancellata', 'rifiutata'].includes(p.stato) && <button className="link" onClick={() => setModifica(true)}><Pencil size={14} /> Sposta o modifica</button>}</header>
              <p className="dettaglio__quando">{dataLunga(p.data)}</p>
              <p className="dettaglio__ore">{p.ora} – {p.ora_fine} <span>({durata(p.durata)})</span></p>
              <p className="dettaglio__dove"><Avatar nome={p.staff_nome} colore={p.staff_colore} piccolo /> {p.staff_nome || 'Da assegnare'} · {p.sede_nome}</p>
            </section>
          )}

          <section className="blocco">
            <header className="blocco__testa"><h3>Servizi</h3></header>
            <ul className="lista-serv">
              {p.servizi.map((s, i) => <li key={i}><span>{s.nome}<small>{durata(s.durata)}</small></span><span>{prezzoServizio(s)}</span></li>)}
            </ul>
            <div className="prezzi">
              <div><span>Prezzo indicativo</span><strong>{euro(p.prezzo_stimato)}</strong></div>
              <PrezzoFinale p={p} salva={salva} />
            </div>
          </section>

          {p.note_cliente && (
            <section className="blocco blocco--nota">
              <header className="blocco__testa"><h3><StickyNote size={17} /> Nota della cliente</h3></header>
              <p>{p.note_cliente}</p>
            </section>
          )}
          <NoteInterne p={p} salva={salva} />
          <p className="dettaglio__meta">Creata il {new Date(p.creata_il.replace(' ', 'T') + 'Z').toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      )}
    </Pannello>
  );
}

function PrezzoFinale({ p, salva }) {
  const [v, setV] = useState(p.prezzo_finale ?? '');
  useEffect(() => setV(p.prezzo_finale ?? ''), [p.prezzo_finale]);
  return (
    <label className="prezzi__finale">
      <span>Incassato</span>
      <span className="input-euro">
        <input type="number" inputMode="decimal" min="0" step="0.5" value={v} placeholder={p.prezzo_stimato ?? ''} onChange={e => setV(e.target.value)}
          onBlur={() => String(v) !== String(p.prezzo_finale ?? '') && salva({ prezzo_finale: v })} />
        <span>€</span>
      </span>
    </label>
  );
}

function NoteInterne({ p, salva }) {
  const [v, setV] = useState(p.note_interne || '');
  useEffect(() => setV(p.note_interne || ''), [p.note_interne]);
  const cambiata = v !== (p.note_interne || '');
  return (
    <section className="blocco">
      <header className="blocco__testa"><h3>Note interne</h3><small>Le vede solo lo staff</small></header>
      <textarea className="area" rows="3" value={v} onChange={e => setV(e.target.value)} placeholder="Es. formula colore 7.1 + 20 vol, preferisce acqua tiepida…" />
      {cambiata && <button className="btn btn--p btn--primario" onClick={() => salva({ note_interne: v })}>Salva nota</button>}
    </section>
  );
}

function Sposta({ p, cfg, onFatto, onAnnulla }) {
  const [data, setData] = useState(p.data);
  const [ora, setOra] = useState(p.ora);
  const [staffId, setStaffId] = useState(p.staff_id);
  const [sedeId, setSedeId] = useState(p.sede_id);
  const [servizi, setServizi] = useState(p.servizi.map(s => s.id));
  const [forza, setForza] = useState(false);
  const [slot, setSlot] = useState(null);
  const durataTot = servizi.reduce((t, id) => t + (cfg.servizi.find(s => s.id === id)?.durata || 0), 0) || p.durata;

  useEffect(() => {
    setSlot(null);
    get(`/admin/slot?sede=${sedeId}&data=${data}&durata=${durataTot}&staff=${staffId || ''}&escludi=${p.id}`).then(setSlot).catch(() => setSlot([]));
  }, [data, staffId, sedeId, durataTot]);

  const staff = cfg.staff.filter(s => s.attivo && s.sede_id === Number(sedeId));
  const opzioni = forza ? Array.from({ length: (21 - 7) * 4 }, (_, i) => fmt(7 * 60 + i * 15)) : (slot || []).map(s => s.ora);
  const sel = opzioni.includes(ora) ? ora : '';

  return (
    <section className="blocco blocco--modifica">
      <header className="blocco__testa"><h3>Sposta o modifica</h3></header>
      <div className="griglia-campi">
        <Campo etichetta="Giorno"><input type="date" value={data} onChange={e => setData(e.target.value)} /></Campo>
        <Campo etichetta="Sede"><select value={sedeId} onChange={e => { setSedeId(Number(e.target.value)); setStaffId(''); }}>{cfg.sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
        <Campo etichetta="Stylist"><select value={staffId || ''} onChange={e => setStaffId(Number(e.target.value) || '')}><option value="">Scegli…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
        <Campo etichetta={forza ? 'Ora' : `Ora (${slot ? `${slot.length} liberi` : '…'})`}>
          <select value={sel} onChange={e => setOra(e.target.value)}>
            <option value="" disabled>{slot && !slot.length && !forza ? 'Nessun orario libero' : 'Scegli…'}</option>
            {opzioni.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Campo>
      </div>
      <Interruttore attivo={forza} onCambia={setForza} etichetta="Ignora gli orari liberi" descrizione="Per inserire comunque l’appuntamento, anche fuori orario o sovrapposto." />
      <details className="servizi-modifica">
        <summary>Cambia servizi ({servizi.length})</summary>
        <div className="spunte">
          {cfg.servizi.filter(s => s.attivo).map(s => (
            <label key={s.id} className="spunta"><input type="checkbox" checked={servizi.includes(s.id)} onChange={e => setServizi(x => e.target.checked ? [...x, s.id] : x.filter(i => i !== s.id))} /><span>{s.nome} <small>{durata(s.durata)}</small></span></label>
          ))}
        </div>
      </details>
      <div className="riga">
        <button className="btn btn--primario" disabled={!sel || !staffId || !servizi.length} onClick={() => onFatto({ data, ora: sel, staff_id: staffId, sede_id: sedeId, servizi, forza })}>Salva modifiche</button>
        <button className="btn" onClick={onAnnulla}>Annulla</button>
      </div>
    </section>
  );
}
