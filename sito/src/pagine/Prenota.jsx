import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalone } from '../App.jsx';
import { Rosa, Scritta } from '../Logo.jsx';
import { api, prezzo, durata, totale, icsUrl, waLink, telLink } from '../api.js';

const PASSI = ['Sede', 'Servizi', 'Stylist', 'Giorno e ora', 'I tuoi dati'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GG = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

const oggiISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const meseDi = d => d.slice(0, 7);
const spostaMese = (m, n) => { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const dataBella = d => { const x = new Date(d + 'T12:00:00'); return `${GIORNI_LUNGHI[x.getDay()]} ${x.getDate()} ${MESI[x.getMonth()].toLowerCase()}`; };

export default function Prenota() {
  const { info, scelti, alterna, impostaScelti } = useSalone();
  const [params] = useSearchParams();
  const [passo, setPasso] = useState(0);
  const [sedeId, setSedeId] = useState(Number(params.get('sede')) || null);
  const [staffId, setStaffId] = useState(0);
  const [data, setData] = useState(null);
  const [ora, setOra] = useState(null);
  const [esito, setEsito] = useState(null);
  const [avviso, setAvviso] = useState(null);
  const testa = useRef(null);

  const sedi = info?.sedi || [];
  useEffect(() => {
    if (!info) return;
    if (!sedeId && sedi.length === 1) setSedeId(sedi[0].id);
    if (sedeId || sedi.length === 1) setPasso(p => Math.max(p, scelti.length ? 2 : 1));
  }, [info]);

  const servizi = useMemo(() => (info?.servizi || []).filter(s => scelti.includes(s.id)), [info, scelti]);
  const minuti = servizi.reduce((t, s) => t + s.durata, 0);
  const staffSede = useMemo(() => (info?.staff || []).filter(s => s.sede_id === sedeId && (!s.servizi?.length || scelti.every(id => s.servizi.includes(id)))), [info, sedeId, scelti]);
  const sede = sedi.find(s => s.id === sedeId);
  const stylist = staffSede.find(s => s.id === staffId);

  useEffect(() => { setOra(null); }, [sedeId, staffId, scelti.join(','), data]);
  useEffect(() => { if (staffId && !staffSede.some(s => s.id === staffId)) setStaffId(0); }, [staffSede]);

  const vai = n => {
    setPasso(n);
    setAvviso(null);
    requestAnimationFrame(() => testa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const puoi = [true, !!sedeId, !!sedeId && servizi.length > 0, !!sedeId && servizi.length > 0, !!(sedeId && servizi.length && data && ora)];

  if (!info) return <div className="caricamento" aria-live="polite">Carico i servizi…</div>;
  if (esito) return <Conferma esito={esito} onNuova={() => { setEsito(null); impostaScelti([]); setData(null); setOra(null); setPasso(sedi.length > 1 ? 0 : 1); }} />;

  return (
    <div className="prenota">
      <header className="prenota__barra">
        <Link to="/" className="marchio" aria-label="Torna al sito Larosa"><Rosa className="marchio__rosa" /><Scritta className="marchio__scritta" /></Link>
        <ol className="passi" aria-label="Passaggi della prenotazione">
          {PASSI.map((p, i) => (
            <li key={p} className={`${i === passo ? 'ora' : ''} ${i < passo ? 'fatto' : ''}`}>
              <button disabled={!puoi[i] || i > passo + 1} onClick={() => vai(i)} aria-current={i === passo ? 'step' : undefined}>
                <span className="passi__n">{i + 1}</span><span className="passi__t">{p}</span>
              </button>
            </li>
          ))}
        </ol>
        <Link to="/" className="prenota__esci">Esci</Link>
      </header>

      <div className="prenota__corpo">
        <section className="prenota__passo" ref={testa} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={passo} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              {passo === 0 && <PassoSede sedi={sedi} sedeId={sedeId} onScegli={id => { setSedeId(id); vai(1); }} />}
              {passo === 1 && <PassoServizi servizi={info.servizi} scelti={scelti} alterna={alterna} onAvanti={() => vai(2)} />}
              {passo === 2 && <PassoStylist staff={staffSede} staffId={staffId} onScegli={id => { setStaffId(id); vai(3); }} />}
              {passo === 3 && <PassoData sedeId={sedeId} staffId={staffId} scelti={scelti} data={data} setData={setData} ora={ora}
                giorniMax={info.salone.giorni_prenotabili} avviso={avviso} onOra={o => { setOra(o); vai(4); }} />}
              {passo === 4 && <PassoDati riepilogo={{ sede, servizi, stylist, data, ora, minuti }} conferma={info.salone.conferma_automatica}
                onFatto={setEsito} onOccupato={msg => { setAvviso(msg); setOra(null); setPasso(3); }}
                payload={{ servizi: scelti, sede_id: sedeId, staff_id: staffId || null, data, ora }} />}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="biglietto" aria-label="Riepilogo della prenotazione">
          <Biglietto sede={sede} servizi={servizi} stylist={stylist} data={data} ora={ora} minuti={minuti} />
          {passo === 1 && servizi.length > 0 && <button className="bottone bottone--scuro bottone--pieno" onClick={() => vai(2)}>Continua</button>}
        </aside>
      </div>

      {passo === 1 && servizi.length > 0 && (
        <div className="prenota__mobile">
          <div><strong>{servizi.length} {servizi.length === 1 ? 'servizio' : 'servizi'}</strong><span>{durata(minuti)}, {totale(servizi).testo}</span></div>
          <button className="bottone bottone--giallo" onClick={() => vai(2)}>Continua</button>
        </div>
      )}
    </div>
  );
}

function Biglietto({ sede, servizi, stylist, data, ora, minuti }) {
  const t = totale(servizi);
  return (
    <div className="biglietto__carta">
      <p className="biglietto__testa">Il tuo appuntamento</p>
      <dl>
        <div><dt>Sede</dt><dd>{sede ? `${sede.nome}, ${sede.indirizzo}` : <em>da scegliere</em>}</dd></div>
        <div><dt>Servizi</dt><dd>{servizi.length ? servizi.map(s => <span key={s.id} className="biglietto__serv">{s.nome}<small>{prezzo(s)}</small></span>) : <em>da scegliere</em>}</dd></div>
        <div><dt>Stylist</dt><dd>{stylist ? stylist.nome : 'Nessuna preferenza'}</dd></div>
        <div><dt>Quando</dt><dd>{data ? <>{dataBella(data)}{ora && <>, ore {ora}</>}</> : <em>da scegliere</em>}</dd></div>
      </dl>
      <div className="biglietto__strappo" aria-hidden="true" />
      <div className="biglietto__totale">
        <div><span>Durata</span><strong>{minuti ? durata(minuti) : '–'}</strong></div>
        <div><span>Prezzo indicativo</span><strong>{servizi.length ? t.testo : '–'}</strong></div>
      </div>
      {t.variabile && servizi.length > 0 && <p className="biglietto__nota">Il prezzo finale dipende da lunghezza e quantità di capelli. Te lo diciamo prima di iniziare.</p>}
    </div>
  );
}

function PassoSede({ sedi, sedeId, onScegli }) {
  return (
    <>
      <h1 className="passo__titolo">In quale sede vuoi venire?</h1>
      <div className="scelte scelte--sedi">
        {sedi.map(s => (
          <button key={s.id} className={`scelta scelta--sede ${s.id === sedeId ? 'scelta--attiva' : ''}`} onClick={() => onScegli(s.id)}>
            <span className="scelta__nome">{s.nome}</span>
            <span className="scelta__det">{s.indirizzo}, {s.cap} {s.citta}</span>
            <span className="scelta__det">{s.telefono}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function PassoServizi({ servizi, scelti, alterna, onAvanti }) {
  const categorie = useMemo(() => {
    const m = new Map();
    for (const s of servizi.filter(s => s.online)) { if (!m.has(s.categoria)) m.set(s.categoria, []); m.get(s.categoria).push(s); }
    return [...m.entries()];
  }, [servizi]);
  const [cerca, setCerca] = useState('');
  const q = cerca.trim().toLowerCase();
  return (
    <>
      <h1 className="passo__titolo">Cosa facciamo?</h1>
      <p className="passo__sotto">Puoi sceglierne più di uno: calcoliamo noi la durata totale.</p>
      <label className="cerca">
        <span className="vh">Cerca un servizio</span>
        <input type="search" placeholder="Cerca: piega, balayage, taglio…" value={cerca} onChange={e => setCerca(e.target.value)} />
      </label>
      {categorie.map(([c, lista]) => {
        const f = lista.filter(s => !q || s.nome.toLowerCase().includes(q) || c.toLowerCase().includes(q));
        if (!f.length) return null;
        return (
          <div key={c} className="gruppo">
            <h2 className="gruppo__titolo">{c}</h2>
            <div className="scelte scelte--servizi">
              {f.map(s => {
                const dentro = scelti.includes(s.id);
                return (
                  <button key={s.id} className={`scelta scelta--servizio ${dentro ? 'scelta--attiva' : ''}`} onClick={() => alterna(s.id)} aria-pressed={dentro}>
                    <span className="scelta__spunta" aria-hidden="true">{dentro ? '✓' : '+'}</span>
                    <span className="scelta__nome">{s.nome}</span>
                    {s.descrizione && <span className="scelta__det">{s.descrizione}</span>}
                    <span className="scelta__meta"><span>{durata(s.durata)}</span><strong>{prezzo(s)}</strong></span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="passo__piede">
        <button className="bottone bottone--scuro bottone--grande" disabled={!scelti.length} onClick={onAvanti}>
          {scelti.length ? 'Continua' : 'Scegli almeno un servizio'}
        </button>
      </div>
    </>
  );
}

const iniziali = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();

function PassoStylist({ staff, staffId, onScegli }) {
  return (
    <>
      <h1 className="passo__titolo">Con chi?</h1>
      <p className="passo__sotto">Se non hai preferenze ti mostriamo più orari liberi.</p>
      <div className="scelte scelte--staff">
        <button className={`scelta scelta--staff ${!staffId ? 'scelta--attiva' : ''}`} onClick={() => onScegli(0)}>
          <span className="avatar avatar--tutti" aria-hidden="true">✶</span>
          <span className="scelta__nome">Nessuna preferenza</span>
          <span className="scelta__det">Il primo stylist libero</span>
        </button>
        {staff.map(s => (
          <button key={s.id} className={`scelta scelta--staff ${staffId === s.id ? 'scelta--attiva' : ''}`} onClick={() => onScegli(s.id)}>
            <span className="avatar" style={{ '--c': s.colore }} aria-hidden="true">{iniziali(s.nome)}</span>
            <span className="scelta__nome">{s.nome}</span>
            <span className="scelta__det">{s.ruolo}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function PassoData({ sedeId, staffId, scelti, data, setData, ora, giorniMax, avviso, onOra }) {
  const oggi = oggiISO();
  const [mese, setMese] = useState(meseDi(data || oggi));
  const [giorni, setGiorni] = useState(null);
  const [slot, setSlot] = useState(null);
  const [errore, setErrore] = useState(null);
  const ultimoMese = meseDi(new Date(Date.now() + giorniMax * 864e5).toISOString().slice(0, 10));
  const chiave = `sede=${sedeId}&servizi=${scelti.join(',')}${staffId ? `&staff=${staffId}` : ''}`;

  useEffect(() => {
    let vivo = true;
    setGiorni(null); setErrore(null);
    api(`/giorni?${chiave}&mese=${mese}`).then(g => {
      if (!vivo) return;
      setGiorni(g);
      if (!data || meseDi(data) !== mese || !g.find(x => x.data === data)?.slot) {
        const primo = g.find(x => x.slot > 0);
        if (primo) setData(primo.data);
        else if (mese < ultimoMese && meseDi(oggi) === mese) setMese(spostaMese(mese, 1));
      }
    }).catch(e => vivo && setErrore(e.message));
    return () => { vivo = false; };
  }, [chiave, mese]);

  useEffect(() => {
    if (!data) return;
    let vivo = true;
    setSlot(null);
    api(`/slot?${chiave}&data=${data}`).then(s => vivo && setSlot(s)).catch(e => vivo && setErrore(e.message));
    return () => { vivo = false; };
  }, [chiave, data, avviso]);

  const [y, m] = mese.split('-').map(Number);
  const primoGiorno = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const max = Math.max(1, ...(giorni || []).map(g => g.slot));
  const mattina = (slot || []).filter(s => s.min < 13 * 60);
  const pomeriggio = (slot || []).filter(s => s.min >= 13 * 60);

  return (
    <>
      <h1 className="passo__titolo">Quando ti va bene?</h1>
      {avviso && <p className="avviso" role="alert">{avviso}</p>}
      {errore && <p className="avviso" role="alert">{errore}</p>}
      <div className="quando">
        <div className="calendario">
          <div className="calendario__testa">
            <button onClick={() => setMese(spostaMese(mese, -1))} disabled={mese <= meseDi(oggi)} aria-label="Mese precedente">‹</button>
            <h2>{MESI[m - 1]} {y}</h2>
            <button onClick={() => setMese(spostaMese(mese, 1))} disabled={mese >= ultimoMese} aria-label="Mese successivo">›</button>
          </div>
          <div className="calendario__griglia" role="grid" aria-busy={!giorni}>
            {GG.map(g => <span key={g} className="calendario__gg" role="columnheader">{g}</span>)}
            {Array.from({ length: primoGiorno }).map((_, i) => <span key={`v${i}`} />)}
            {(giorni || Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => ({ data: `${mese}-${String(i + 1).padStart(2, '0')}`, slot: -1 }))).map(g => {
              const n = Number(g.data.slice(8));
              const libero = g.slot > 0;
              return (
                <button key={g.data} role="gridcell" disabled={!libero} onClick={() => setData(g.data)}
                  className={`giorno ${g.data === data ? 'giorno--scelto' : ''} ${g.data === oggi ? 'giorno--oggi' : ''} ${g.slot < 0 ? 'giorno--carica' : ''}`}
                  aria-label={`${dataBella(g.data)}${libero ? `, ${g.slot} orari liberi` : ', nessun orario libero'}`}>
                  <span>{n}</span>
                  {libero && <i style={{ '--p': Math.max(0.2, g.slot / max) }} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="calendario__legenda"><i aria-hidden="true" /> La barretta mostra quanti orari restano liberi.</p>
        </div>

        <div className="orari">
          <h2>{data ? dataBella(data) : 'Scegli un giorno'}</h2>
          {data && !slot && <p className="orari__vuoto">Cerco gli orari liberi…</p>}
          {slot && !slot.length && <p className="orari__vuoto">Questo giorno è pieno. Prova un altro giorno o un altro stylist.</p>}
          {[['Mattina', mattina], ['Pomeriggio', pomeriggio]].map(([t, l]) => l.length > 0 && (
            <div key={t} className="orari__gruppo">
              <h3>{t}</h3>
              <div className="orari__lista">
                {l.map(s => <button key={s.ora} className={`orario ${ora === s.ora ? 'orario--scelto' : ''}`} onClick={() => onOra(s.ora)}>{s.ora}</button>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PassoDati({ riepilogo, payload, conferma, onFatto, onOccupato }) {
  const [f, setF] = useState(() => { try { return JSON.parse(localStorage.getItem('larosa-dati') || '{}'); } catch { return {}; } });
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);
  const [ricorda, setRicorda] = useState(true);
  const cambia = k => e => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function invia(e) {
    e.preventDefault();
    setErrore(null); setInvio(true);
    try {
      const r = await api('/prenota', { method: 'POST', body: { ...payload, ...f, sito: e.target.sito.value } });
      try {
        if (ricorda) localStorage.setItem('larosa-dati', JSON.stringify({ nome: f.nome, cognome: f.cognome, telefono: f.telefono, email: f.email }));
        else localStorage.removeItem('larosa-dati');
        const mie = JSON.parse(localStorage.getItem('larosa-mie') || '[]');
        localStorage.setItem('larosa-mie', JSON.stringify([r.codice, ...mie.filter(c => c !== r.codice)].slice(0, 10)));
      } catch {}
      onFatto(r);
    } catch (err) {
      if (err.status === 409) onOccupato(err.message);
      else setErrore(err.message);
    } finally { setInvio(false); }
  }

  return (
    <form onSubmit={invia} className="modulo">
      <h1 className="passo__titolo">Ultimo passo: chi sei?</h1>
      <p className="passo__sotto">
        {dataBella(riepilogo.data)} alle {riepilogo.ora} in {riepilogo.sede?.nome}.
        {conferma ? ' La prenotazione si conferma subito.' : ' Ti confermiamo l’appuntamento su WhatsApp o per telefono.'}
      </p>
      <div className="modulo__griglia">
        <label><span>Nome</span><input required autoComplete="given-name" value={f.nome || ''} onChange={cambia('nome')} /></label>
        <label><span>Cognome</span><input autoComplete="family-name" value={f.cognome || ''} onChange={cambia('cognome')} /></label>
        <label><span>Cellulare</span><input required type="tel" inputMode="tel" autoComplete="tel" placeholder="333 123 4567" value={f.telefono || ''} onChange={cambia('telefono')} /></label>
        <label><span>Email <small>facoltativa</small></span><input type="email" autoComplete="email" value={f.email || ''} onChange={cambia('email')} /></label>
        <label className="modulo__largo"><span>Note per lo stylist <small>facoltative</small></span>
          <textarea rows="3" placeholder="Es. capelli molto lunghi, vorrei portare una foto di riferimento…" value={f.note || ''} onChange={cambia('note')} /></label>
        <input type="text" name="sito" tabIndex="-1" autoComplete="off" className="vh" aria-hidden="true" />
      </div>
      <label className="spunta"><input type="checkbox" checked={ricorda} onChange={e => setRicorda(e.target.checked)} /><span>Ricorda i miei dati su questo dispositivo</span></label>
      <label className="spunta"><input type="checkbox" checked={!!f.marketing} onChange={cambia('marketing')} /><span>Avvisatemi di promozioni e novità (al massimo una volta al mese)</span></label>
      {errore && <p className="avviso" role="alert">{errore}</p>}
      <div className="passo__piede">
        <button className="bottone bottone--scuro bottone--grande" disabled={invio}>{invio ? 'Invio in corso…' : conferma ? 'Conferma la prenotazione' : 'Invia la richiesta'}</button>
        <p className="modulo__privacy">Usiamo i tuoi dati solo per gestire l’appuntamento.</p>
      </div>
    </form>
  );
}

function Conferma({ esito, onNuova }) {
  const attesa = esito.stato === 'in_attesa';
  return (
    <div className="conferma">
      <motion.div className="conferma__carta" initial={{ opacity: 0, y: 30, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
        <svg className="conferma__segno" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
          <motion.path d="M15 27 l8 8 l15 -17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
        </svg>
        <h1>{attesa ? 'Richiesta inviata' : 'Prenotazione confermata'}</h1>
        <p className="conferma__sotto">
          {attesa ? `Grazie ${esito.nome}! Il salone controlla l’agenda e ti conferma su WhatsApp o per telefono.` : `Grazie ${esito.nome}, ti aspettiamo!`}
        </p>
        <div className="conferma__dettagli">
          <p className="conferma__quando">{esito.data_estesa}<br /><strong>ore {esito.ora}</strong></p>
          <p>{esito.servizi.map(s => s.nome).join(', ')}<br /><span>{durata(esito.durata)}{esito.staff ? `, con ${esito.staff}` : ''}</span></p>
          <p>{esito.sede.nome}<br /><span>{esito.sede.indirizzo}, Torino</span></p>
        </div>
        <div className="conferma__codice">
          <span>Codice prenotazione</span>
          <strong>{esito.codice}</strong>
        </div>
        <div className="riga-bottoni riga-bottoni--centro">
          <a className="bottone bottone--scuro" href={icsUrl(esito.codice)}>Aggiungi al calendario</a>
          <Link className="bottone bottone--linea" to={`/prenotazione/${esito.codice}`}>Gestisci o annulla</Link>
        </div>
        <p className="conferma__aiuto">
          Hai bisogno di cambiare qualcosa? <a href={waLink(esito.sede.whatsapp, `Ciao! Ho la prenotazione ${esito.codice}`)} target="_blank" rel="noreferrer">Scrivici su WhatsApp</a> o chiama il <a href={telLink(esito.sede.telefono)}>{esito.sede.telefono}</a>.
        </p>
      </motion.div>
      <div className="riga-bottoni riga-bottoni--centro">
        <button className="link" onClick={onNuova}>Fai un’altra prenotazione</button>
        <Link className="link" to="/">Torna al sito</Link>
      </div>
    </div>
  );
}
