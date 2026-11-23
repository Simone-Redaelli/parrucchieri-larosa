import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, ArrowUp, ArrowDown, Globe, Scissors } from 'lucide-react';
import { useApp } from '../App.jsx';
import { post, patch, del, durata, prezzoServizio } from '../api.js';
import { Modale, Campo, Interruttore, Segmenti, useToast, useConferma, Vuoto } from '../ui.jsx';

const VUOTO = { nome: '', categoria: '', descrizione: '', durata: 30, prezzo: '', prezzo_max: '', tipo_prezzo: 'fisso', online: 1, attivo: 1 };

export default function Listino() {
  const { cfg, ricaricaCfg, titolare } = useApp();
  const toast = useToast();
  const [modifica, setModifica] = useState(null);
  const categorie = useMemo(() => {
    const m = new Map();
    for (const s of cfg.servizi) { if (!m.has(s.categoria)) m.set(s.categoria, []); m.get(s.categoria).push(s); }
    return [...m.entries()];
  }, [cfg.servizi]);

  const aggiorna = async (s, c) => { try { await patch(`/admin/servizi/${s.id}`, c); await ricaricaCfg(); } catch (e) { toast(e.message, { tipo: 'errore' }); } };
  const scambia = async (lista, i, j) => {
    const a = lista[i], b = lista[j];
    if (!b) return;
    const oa = a.ordine === b.ordine ? a.ordine + (j > i ? 1 : -1) : b.ordine;
    await Promise.all([patch(`/admin/servizi/${a.id}`, { ordine: oa }), patch(`/admin/servizi/${b.id}`, { ordine: a.ordine })]);
    ricaricaCfg();
  };

  return (
    <div className="pagina">
      <header className="pagina__testa">
        <div><h1>Listino</h1><p className="pagina__sotto">Durata, prezzi e servizi prenotabili dal sito. Le modifiche sono subito online.</p></div>
        {titolare && <div className="pagina__azioni"><button className="btn btn--primario" onClick={() => setModifica(VUOTO)}><Plus size={17} /> Nuovo servizio</button></div>}
      </header>
      {!categorie.length && <Vuoto icona={Scissors} titolo="Il listino è vuoto" testo="Aggiungi il primo servizio." />}
      {categorie.map(([cat, lista]) => (
        <section key={cat} className="riquadro riquadro--lista">
          <header className="riquadro__testa"><h2>{cat}</h2><small>{lista.length} servizi</small></header>
          <ul className="servizi">
            {lista.map((s, i) => (
              <li key={s.id} className={`servizio ${s.attivo ? '' : 'servizio--spento'}`}>
                {titolare && <span className="servizio__ordine">
                  <button className="icona-btn icona-btn--p" disabled={i === 0} onClick={() => scambia(lista, i, i - 1)} aria-label="Sposta su"><ArrowUp size={15} /></button>
                  <button className="icona-btn icona-btn--p" disabled={i === lista.length - 1} onClick={() => scambia(lista, i, i + 1)} aria-label="Sposta giù"><ArrowDown size={15} /></button>
                </span>}
                <span className="servizio__nome"><strong>{s.nome}</strong>{s.descrizione && <small>{s.descrizione}</small>}</span>
                <span className="servizio__durata">{durata(s.durata)}</span>
                <span className="servizio__prezzo">{prezzoServizio(s)}</span>
                <button className={`pillola ${s.online && s.attivo ? 'pillola--on' : ''}`} disabled={!titolare || !s.attivo} onClick={() => aggiorna(s, { online: s.online ? 0 : 1 })} title="Prenotabile dal sito">
                  <Globe size={14} /> {s.online ? 'Sul sito' : 'Solo al telefono'}
                </button>
                {titolare && <button className="icona-btn" onClick={() => setModifica(s)} aria-label={`Modifica ${s.nome}`}><Pencil size={17} /></button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ModaleServizio servizio={modifica} categorie={categorie.map(c => c[0])} onChiudi={() => setModifica(null)} onFatto={async msg => { setModifica(null); await ricaricaCfg(); toast(msg, { tipo: 'ok' }); }} />
    </div>
  );
}

function ModaleServizio({ servizio, categorie, onChiudi, onFatto }) {
  const [f, setF] = useState(VUOTO);
  const [errore, setErrore] = useState(null);
  const chiedi = useConferma();
  useEffect(() => { if (servizio) { setF({ ...VUOTO, ...servizio, prezzo: servizio.prezzo ?? '', prezzo_max: servizio.prezzo_max ?? '' }); setErrore(null); } }, [servizio]);
  const c = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const nuovo = !servizio?.id;

  async function salva() {
    const corpo = { ...f, durata: Number(f.durata), prezzo: f.tipo_prezzo === 'convenire' || f.prezzo === '' ? null : Number(f.prezzo), prezzo_max: f.tipo_prezzo === 'range' && f.prezzo_max !== '' ? Number(f.prezzo_max) : null };
    if (!corpo.nome.trim() || !corpo.categoria.trim()) return setErrore('Nome e categoria sono obbligatori.');
    try {
      if (nuovo) await post('/admin/servizi', { ...corpo, ordine: 999 });
      else await patch(`/admin/servizi/${servizio.id}`, corpo);
      onFatto(nuovo ? 'Servizio aggiunto' : 'Servizio aggiornato');
    } catch (e) { setErrore(e.message); }
  }
  async function elimina() {
    if (!await chiedi({ titolo: `Eliminare ${servizio.nome}?`, testo: 'Le prenotazioni passate restano. Se vuoi solo toglierlo per un po’, disattivalo.', conferma: 'Elimina', pericolo: true })) return;
    await del(`/admin/servizi/${servizio.id}`); onFatto('Servizio eliminato');
  }

  return (
    <Modale aperta={!!servizio} onChiudi={onChiudi} titolo={nuovo ? 'Nuovo servizio' : 'Modifica servizio'}
      piedi={<>{!nuovo && <button className="btn btn--rosso-linea spingi-sx" onClick={elimina}>Elimina</button>}<button className="btn" onClick={onChiudi}>Annulla</button><button className="btn btn--primario" onClick={salva}>Salva</button></>}>
      <div className="griglia-campi">
        <Campo etichetta="Nome"><input autoFocus value={f.nome} onChange={c('nome')} /></Campo>
        <Campo etichetta="Categoria"><input list="categorie" value={f.categoria} onChange={c('categoria')} /><datalist id="categorie">{categorie.map(x => <option key={x} value={x} />)}</datalist></Campo>
        <Campo etichetta="Descrizione" largo aiuto="Compare sul sito sotto il nome."><textarea className="area" rows="2" value={f.descrizione || ''} onChange={c('descrizione')} /></Campo>
        <Campo etichetta="Durata" aiuto="Serve per calcolare gli orari liberi.">
          <select value={f.durata} onChange={c('durata')}>{Array.from({ length: 60 }, (_, i) => (i + 1) * 5).map(m => <option key={m} value={m}>{durata(m)}</option>)}</select>
        </Campo>
        <Campo etichetta="Tipo di prezzo">
          <Segmenti valore={f.tipo_prezzo} onCambia={v => setF(x => ({ ...x, tipo_prezzo: v }))} etichetta="Tipo di prezzo" opzioni={[['fisso', 'Fisso'], ['da', 'A partire da'], ['range', 'Da… a…'], ['convenire', 'Da concordare']]} />
        </Campo>
        {f.tipo_prezzo !== 'convenire' && <Campo etichetta={f.tipo_prezzo === 'range' ? 'Prezzo minimo (€)' : 'Prezzo (€)'}><input type="number" min="0" step="0.5" value={f.prezzo} onChange={c('prezzo')} /></Campo>}
        {f.tipo_prezzo === 'range' && <Campo etichetta="Prezzo massimo (€)"><input type="number" min="0" step="0.5" value={f.prezzo_max} onChange={c('prezzo_max')} /></Campo>}
      </div>
      <Interruttore attivo={!!f.online} onCambia={v => setF(x => ({ ...x, online: v ? 1 : 0 }))} etichetta="Prenotabile dal sito" descrizione="Se spento, sul sito compare con “al telefono”." />
      <Interruttore attivo={!!f.attivo} onCambia={v => setF(x => ({ ...x, attivo: v ? 1 : 0 }))} etichetta="Attivo" descrizione="Se spento, sparisce dal sito e dal gestionale ma resta nello storico." />
      {errore && <p className="errore">{errore}</p>}
    </Modale>
  );
}
