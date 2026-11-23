import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../App.jsx';
import { get, patch, oggi, piuGiorni, lunedi, dataLunga, dataCorta, meseAnno, fmt, nomeCompleto } from '../api.js';
import { Segmenti, Rotella, Avatar, useToast } from '../ui.jsx';

const PPM = 1.7;
const SNAP = 15;

export default function Agenda() {
  const { cfg, versione, apriPrenotazione, nuovaPrenotazione, aggiorna } = useApp();
  const toast = useToast();
  const mobile = matchMedia('(max-width: 760px)').matches;
  const [data, setData] = useState(() => sessionStorage.getItem('agenda-data') || oggi());
  const [vista, setVista] = useState(() => localStorage.getItem('agenda-vista') || 'giorno');
  const [sedeId, setSedeId] = useState(() => Number(localStorage.getItem('agenda-sede')) || 0);
  const [staffSett, setStaffSett] = useState(0);
  const [dati, setDati] = useState(null);

  useEffect(() => { sessionStorage.setItem('agenda-data', data); }, [data]);
  useEffect(() => { localStorage.setItem('agenda-vista', vista); }, [vista]);
  useEffect(() => { localStorage.setItem('agenda-sede', String(sedeId)); }, [sedeId]);

  const dal = vista === 'giorno' ? data : lunedi(data);
  const al = vista === 'giorno' ? data : piuGiorni(dal, 6);

  useEffect(() => {
    let vivo = true;
    get(`/admin/agenda?dal=${dal}&al=${al}`).then(d => vivo && setDati(d)).catch(e => toast(e.message, { tipo: 'errore' }));
    return () => { vivo = false; };
  }, [dal, al, versione]);

  const staff = cfg.staff.filter(s => s.attivo && (!sedeId || s.sede_id === sedeId));
  const sede = id => cfg.sedi.find(s => s.id === id);

  const colonne = useMemo(() => {
    if (!dati) return [];
    if (vista === 'giorno') {
      const g = dati.giorni[0];
      return staff.map(s => ({
        chiave: `s${s.id}`, data, staffIds: [s.id], staffId: s.id, sedeId: s.sede_id,
        titolo: s.nome, sotto: sedi2(cfg) ? sede(s.sede_id)?.nome : s.ruolo, colore: s.colore,
        turni: g?.turni[s.id] || [],
      }));
    }
    const filtro = staffSett ? staff.filter(s => s.id === staffSett) : staff;
    return dati.giorni.map(g => {
      const turni = filtro.flatMap(s => g.turni[s.id] || []);
      return { chiave: g.data, data: g.data, staffIds: filtro.map(s => s.id), staffId: staffSett || null, sedeId: sedeId || null, titolo: dataCorta(g.data), oggi: g.data === oggi(), turni };
    });
  }, [dati, vista, sedeId, staffSett, cfg]);

  const pren = (dati?.prenotazioni || []).filter(p => !['cancellata', 'rifiutata'].includes(p.stato));

  const [inizio, fine] = useMemo(() => {
    let a = 9 * 60, b = 19 * 60;
    for (const c of colonne) for (const [x, y] of c.turni) { a = Math.min(a, x); b = Math.max(b, y); }
    for (const p of pren) { a = Math.min(a, p.inizio); b = Math.max(b, p.fine); }
    return [Math.max(0, Math.floor((a - 30) / 60) * 60), Math.min(24 * 60, Math.ceil((b + 30) / 60) * 60)];
  }, [colonne, pren]);

  const sposta = n => setData(d => piuGiorni(d, vista === 'giorno' ? n : n * 7));

  async function muovi(p, col, min) {
    const corpo = { ora: fmt(min), data: col.data };
    if (vista === 'giorno') corpo.staff_id = col.staffId;
    if (corpo.ora === p.ora && corpo.data === p.data && (!corpo.staff_id || corpo.staff_id === p.staff_id)) return;
    setDati(d => ({ ...d, prenotazioni: d.prenotazioni.map(x => x.id === p.id ? { ...x, data: col.data, inizio: min, fine: min + (p.fine - p.inizio), staff_id: corpo.staff_id || x.staff_id, ora: corpo.ora } : x) }));
    try {
      await patch(`/admin/prenotazioni/${p.id}`, corpo);
      toast(`${nomeCompleto(p)} spostata alle ${corpo.ora}${vista === 'giorno' && corpo.staff_id !== p.staff_id ? ` con ${cfg.staff.find(s => s.id === corpo.staff_id)?.nome}` : ''}`, { tipo: 'ok' });
    } catch (e) { toast(e.message, { tipo: 'errore' }); }
    aggiorna();
  }

  return (
    <div className="pagina pagina--agenda">
      <header className="agenda__barra">
        <div className="agenda__nav">
          <button className="icona-btn icona-btn--bordo" onClick={() => sposta(-1)} aria-label={vista === 'giorno' ? 'Giorno precedente' : 'Settimana precedente'}><ChevronLeft size={20} /></button>
          <button className="btn btn--p" onClick={() => setData(oggi())} disabled={data === oggi()}>Oggi</button>
          <button className="icona-btn icona-btn--bordo" onClick={() => sposta(1)} aria-label={vista === 'giorno' ? 'Giorno successivo' : 'Settimana successiva'}><ChevronRight size={20} /></button>
          <label className="agenda__data">
            <span>{vista === 'giorno' ? dataLunga(data) : `${dataCorta(dal)} – ${dataCorta(al)}`}</span>
            <small>{meseAnno(data)}</small>
            <input type="date" value={data} onChange={e => e.target.value && setData(e.target.value)} aria-label="Scegli il giorno" />
          </label>
        </div>
        <div className="agenda__filtri">
          <Segmenti valore={vista} onCambia={setVista} etichetta="Vista" opzioni={[['giorno', 'Giorno'], ['settimana', 'Settimana']]} />
          {cfg.sedi.length > 1 && (
            <select className="select-piccolo" value={sedeId} onChange={e => { setSedeId(Number(e.target.value)); setStaffSett(0); }} aria-label="Sede">
              <option value={0}>Tutte le sedi</option>
              {cfg.sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
          {vista === 'settimana' && (
            <select className="select-piccolo" value={staffSett} onChange={e => setStaffSett(Number(e.target.value))} aria-label="Stylist">
              <option value={0}>Tutto lo staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
          <button className="btn btn--primario btn--p agenda__nuovo" onClick={() => nuovaPrenotazione({ data, sede_id: sedeId || undefined })}><Plus size={17} /> Nuovo</button>
        </div>
      </header>
      {!dati ? <Rotella /> : !colonne.length ? <p className="muto">Nessuno stylist attivo in questa sede. Aggiungilo dalla pagina Staff.</p> : (
        <Griglia colonne={colonne} pren={pren} inizio={inizio} fine={fine} vista={vista} mobile={mobile}
          onApri={apriPrenotazione} onMuovi={muovi}
          onNuovo={(col, min) => nuovaPrenotazione({ data: col.data, ora: fmt(min), staff_id: col.staffId || undefined, sede_id: col.sedeId || undefined })} />
      )}
      <p className="agenda__aiuto">Trascina un appuntamento per spostarlo. Clicca uno spazio vuoto per aggiungerne uno.</p>
    </div>
  );
}

const sedi2 = cfg => cfg.sedi.filter(s => s.attiva).length > 1;

function corsie(lista) {
  const ord = [...lista].sort((a, b) => a.inizio - b.inizio || b.fine - a.fine);
  const out = new Map();
  let gruppo = [], fineGruppo = -1;
  const chiudi = () => {
    const corsieFine = [];
    for (const p of gruppo) {
      let i = corsieFine.findIndex(f => f <= p.inizio);
      if (i < 0) { i = corsieFine.length; corsieFine.push(0); }
      corsieFine[i] = p.fine;
      out.set(p.id, { corsia: i });
    }
    for (const p of gruppo) out.get(p.id).tot = corsieFine.length;
    gruppo = [];
  };
  for (const p of ord) {
    if (p.inizio >= fineGruppo && gruppo.length) chiudi();
    gruppo.push(p); fineGruppo = Math.max(fineGruppo, p.fine);
  }
  if (gruppo.length) chiudi();
  return out;
}

function Griglia({ colonne, pren, inizio, fine, vista, mobile, onApri, onMuovi, onNuovo }) {
  const area = useRef(null);
  const [trascina, setTrascina] = useState(null);
  const mouse = useRef(false);
  const [adesso, setAdesso] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setAdesso(new Date()), 60000); return () => clearInterval(t); }, []);
  const minAdesso = adesso.getHours() * 60 + adesso.getMinutes();
  const altezza = (fine - inizio) * PPM;
  const ore = [];
  for (let m = inizio; m < fine; m += 60) ore.push(m);

  useEffect(() => {
    const el = area.current?.closest('.agenda__scorri');
    if (!el) return;
    const target = colonne.some(c => c.data === oggi()) ? Math.max(0, (minAdesso - inizio - 90) * PPM) : Math.max(0, (9 * 60 - inizio) * PPM);
    el.scrollTop = target;
  }, [colonne.length, colonne[0]?.data, inizio, vista]);

  const pDi = col => pren.filter(p => p.data === col.data && col.staffIds.includes(p.staff_id));

  const daPuntatore = (e, colIdx) => {
    const r = area.current.getBoundingClientRect();
    const w = r.width / colonne.length;
    const ci = colIdx ?? Math.min(colonne.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / w)));
    const min = inizio + Math.round(((e.clientY - r.top) / PPM) / SNAP) * SNAP;
    return { ci, min };
  };

  function giu(e, p, ci) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    mouse.current = true;
    const partenza = { x: e.clientX, y: e.clientY };
    const r = area.current.getBoundingClientRect();
    const offset = (e.clientY - r.top) / PPM - (p.inizio - inizio);
    let attivo = false, ultimo = null;
    const muovi = ev => {
      if (!attivo && Math.hypot(ev.clientX - partenza.x, ev.clientY - partenza.y) < 5) return;
      attivo = true;
      const rr = area.current.getBoundingClientRect();
      const w = rr.width / colonne.length;
      const nci = Math.min(colonne.length - 1, Math.max(0, Math.floor((ev.clientX - rr.left) / w)));
      let min = inizio + Math.round(((ev.clientY - rr.top) / PPM - offset) / SNAP) * SNAP;
      min = Math.max(inizio, Math.min(fine - (p.fine - p.inizio), min));
      ultimo = { ci: nci, min };
      setTrascina({ id: p.id, ...ultimo });
    };
    const su = () => {
      window.removeEventListener('pointermove', muovi);
      window.removeEventListener('pointerup', su);
      setTrascina(null);
      if (attivo && ultimo) onMuovi(p, colonne[ultimo.ci], ultimo.min);
      else onApri(p.id);
    };
    window.addEventListener('pointermove', muovi);
    window.addEventListener('pointerup', su);
  }

  return (
    <div className={`agenda agenda--${vista}`} style={{ '--n': colonne.length }}>
      <div className="agenda__scorri">
        <div className="agenda__testa">
          <div className="agenda__angolo" />
          {colonne.map(c => (
            <div key={c.chiave} className={`agenda__col-testa ${c.oggi ? 'oggi' : ''}`}>
              {c.colore && <Avatar nome={c.titolo} colore={c.colore} piccolo />}
              <span><strong>{c.titolo}</strong>{c.sotto && <small>{c.sotto}</small>}</span>
              <em>{pDi(c).length || ''}</em>
            </div>
          ))}
        </div>
        <div className="agenda__corpo" style={{ height: altezza }}>
          <div className="agenda__ore">
            {ore.map(m => <span key={m} style={{ top: (m - inizio) * PPM }}>{fmt(m)}</span>)}
          </div>
          <div className="agenda__area" ref={area}>
            {ore.map(m => <div key={m} className="agenda__riga" style={{ top: (m - inizio) * PPM }} />)}
            {colonne.map((c, ci) => {
              const lista = pDi(c);
              const lanes = corsie(lista);
              return (
                <div key={c.chiave} className="agenda__col" style={{ left: `calc(${ci} * 100% / var(--n))` }}
                  onClick={e => { if (e.target !== e.currentTarget && !e.target.classList.contains('agenda__turno')) return; const { min } = daPuntatore(e, ci); onNuovo(c, Math.min(min, fine - SNAP)); }}>
                  {c.turni.map(([a, b], i) => <div key={i} className="agenda__turno" style={{ top: (a - inizio) * PPM, height: (b - a) * PPM }} />)}
                  {c.data === oggi() && minAdesso >= inizio && minAdesso <= fine && <div className="agenda__adesso" style={{ top: (minAdesso - inizio) * PPM }} />}
                  {lista.map(p => {
                    const l = lanes.get(p.id) || { corsia: 0, tot: 1 };
                    const corto = (p.fine - p.inizio) <= 30;
                    const fantasma = trascina?.id === p.id;
                    return (
                      <button key={p.id} className={`blocco-app blocco-app--${p.stato} ${corto ? 'corto' : ''} ${l.tot >= 3 ? 'stretto' : ''} ${fantasma ? 'trascinato' : ''} ${p.inizio + (p.fine - p.inizio) <= minAdesso && p.data <= oggi() ? 'passato' : ''}`}
                        style={{ top: (p.inizio - inizio) * PPM + 1, height: Math.max(18, (p.fine - p.inizio) * PPM - 2), left: `calc(${l.corsia} * 100% / ${l.tot} + 3px)`, width: `calc(100% / ${l.tot} - 6px)`, '--c': p.staff_colore || 'var(--prugna-2)' }}
                        onPointerDown={e => giu(e, p, ci)}
                        onClick={() => { if (mouse.current) { mouse.current = false; return; } onApri(p.id); }}
                                                aria-label={`${p.ora}-${p.ora_fine}, ${nomeCompleto(p)}, ${p.servizi.map(s => s.nome).join(', ')}`}>
                        <span className="blocco-app__ora">{p.ora}{!corto && `–${p.ora_fine}`}</span>
                        <strong>{nomeCompleto(p)}</strong>
                        {!corto && <span className="blocco-app__serv">{p.servizi.map(s => s.nome).join(', ')}</span>}
                        {vista === 'settimana' && !corto && <span className="blocco-app__chi">{p.staff_nome}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {trascina && (() => {
              const p = pren.find(x => x.id === trascina.id);
              if (!p) return null;
              return (
                <div className="blocco-ombra" style={{ top: (trascina.min - inizio) * PPM, height: (p.fine - p.inizio) * PPM, left: `calc(${trascina.ci} * 100% / var(--n) + 3px)`, width: 'calc(100% / var(--n) - 6px)' }}>
                  <strong>{fmt(trascina.min)}</strong><span>{colonne[trascina.ci].titolo}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
