import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { STATI, iniziali } from './api.js';
import { ROSA } from '../../condivisi/logo.js';

const rosaD = ROSA.petali.map(p => p.d).join('');
export function Rosa({ className = '', oro = false }) {
  return (
    <svg className={className} viewBox={`0 0 ${ROSA.w} ${ROSA.h}`} aria-hidden="true">
      {oro && <defs><linearGradient id="gOro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8A6426" /><stop offset=".3" stopColor="#E7C06A" /><stop offset=".5" stopColor="#FFF0B5" /><stop offset=".72" stopColor="#D6A445" /><stop offset="1" stopColor="#7C561D" /></linearGradient></defs>}
      <path fill={oro ? 'url(#gOro)' : 'currentColor'} fillRule="evenodd" d={rosaD} />
    </svg>
  );
}

export function Stato({ stato }) {
  const s = STATI[stato] || { nome: stato, classe: '' };
  return <span className={`stato stato--${s.classe}`}>{s.nome}</span>;
}

export function Avatar({ nome, colore, piccolo }) {
  return <span className={`avatar ${piccolo ? 'avatar--p' : ''}`} style={{ '--c': colore || 'var(--prugna-2)' }} aria-hidden="true">{iniziali(nome)}</span>;
}

export function Rotella({ testo = 'Carico…' }) {
  return <div className="rotella" role="status"><Loader2 className="gira" size={20} /><span>{testo}</span></div>;
}

export function Vuoto({ icona: Icona, titolo, testo, children }) {
  return (
    <div className="vuoto">
      {Icona && <span className="vuoto__icona"><Icona size={22} /></span>}
      <strong>{titolo}</strong>
      {testo && <p>{testo}</p>}
      {children}
    </div>
  );
}

export function Modale({ aperta, onChiudi, titolo, children, piedi, larga }) {
  useEffect(() => {
    if (!aperta) return;
    const f = e => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aperta, onChiudi]);
  return (
    <AnimatePresence>
      {aperta && (
        <motion.div className="velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && onChiudi()}>
          <motion.div className={`modale ${larga ? 'modale--larga' : ''}`} role="dialog" aria-modal="true" aria-label={titolo}
            initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: .98 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <header className="modale__testa">
              <h2>{titolo}</h2>
              <button className="icona-btn" onClick={onChiudi} aria-label="Chiudi"><X size={20} /></button>
            </header>
            <div className="modale__corpo">{children}</div>
            {piedi && <footer className="modale__piedi">{piedi}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Pannello({ aperto, onChiudi, titolo, children, piedi }) {
  useEffect(() => {
    if (!aperto) return;
    const f = e => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aperto, onChiudi]);
  return (
    <AnimatePresence>
      {aperto && (
        <motion.div className="velo velo--pannello" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && onChiudi()}>
          <motion.aside className="pannello" role="dialog" aria-modal="true" aria-label={titolo}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
            <header className="modale__testa">
              <h2>{titolo}</h2>
              <button className="icona-btn" onClick={onChiudi} aria-label="Chiudi"><X size={20} /></button>
            </header>
            <div className="pannello__corpo">{children}</div>
            {piedi && <footer className="modale__piedi">{piedi}</footer>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function Toasts({ children }) {
  const [lista, setLista] = useState([]);
  const n = useRef(0);
  const toglie = id => setLista(l => l.filter(t => t.id !== id));
  const toast = useCallback((testo, opz = {}) => {
    const id = ++n.current;
    setLista(l => [...l.slice(-3), { id, testo, ...opz }]);
    setTimeout(() => toglie(id), opz.durata || 4200);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {lista.map(t => (
            <motion.div key={t.id} layout className={`toast toast--${t.tipo || 'info'}`} initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}>
              <div className="toast__testo">{t.titolo && <strong>{t.titolo}</strong>}<span>{t.testo}</span></div>
              {t.azione && <button className="toast__azione" onClick={() => { t.azione.fn(); toglie(t.id); }}>{t.azione.testo}</button>}
              <button className="icona-btn icona-btn--p" onClick={() => toglie(t.id)} aria-label="Chiudi notifica"><X size={16} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function Campo({ etichetta, aiuto, children, largo }) {
  return (
    <label className={`campo ${largo ? 'campo--largo' : ''}`}>
      <span className="campo__etichetta">{etichetta}</span>
      {children}
      {aiuto && <small className="campo__aiuto">{aiuto}</small>}
    </label>
  );
}

export function Interruttore({ attivo, onCambia, etichetta, descrizione }) {
  return (
    <label className="interruttore">
      <span className="interruttore__testi"><span>{etichetta}</span>{descrizione && <small>{descrizione}</small>}</span>
      <input type="checkbox" role="switch" checked={!!attivo} onChange={e => onCambia(e.target.checked)} />
      <span className="interruttore__binario" aria-hidden="true"><span /></span>
    </label>
  );
}

export function Segmenti({ valore, opzioni, onCambia, etichetta }) {
  return (
    <div className="segmenti" role="radiogroup" aria-label={etichetta}>
      {opzioni.map(([v, t]) => (
        <button key={v} role="radio" aria-checked={valore === v} className={valore === v ? 'attivo' : ''} onClick={() => onCambia(v)}>{t}</button>
      ))}
    </div>
  );
}

const ConfermaCtx = createContext(null);
export const useConferma = () => useContext(ConfermaCtx);
export function Conferme({ children }) {
  const [stato, setStato] = useState(null);
  const chiedi = useCallback(opz => new Promise(ok => setStato({ ...opz, ok })), []);
  const chiudi = v => { stato?.ok(v); setStato(null); };
  return (
    <ConfermaCtx.Provider value={chiedi}>
      {children}
      <Modale aperta={!!stato} onChiudi={() => chiudi(false)} titolo={stato?.titolo || 'Sei sicuro?'}
        piedi={<><button className="btn" onClick={() => chiudi(false)}>{stato?.annulla || 'Annulla'}</button><button className={`btn ${stato?.pericolo ? 'btn--rosso' : 'btn--primario'}`} onClick={() => chiudi(true)} autoFocus>{stato?.conferma || 'Conferma'}</button></>}>
        <p className="testo-modale">{stato?.testo}</p>
      </Modale>
    </ConfermaCtx.Provider>
  );
}

export function useCarica(fn, deps) {
  const [stato, setStato] = useState({ dati: null, errore: null, carica: true });
  const ricarica = useCallback(() => {
    let vivo = true;
    setStato(s => ({ ...s, carica: true }));
    fn().then(d => vivo && setStato({ dati: d, errore: null, carica: false })).catch(e => vivo && setStato(s => ({ ...s, errore: e.message, carica: false })));
    return () => { vivo = false; };
  }, deps);
  useEffect(() => ricarica(), [ricarica]);
  return { ...stato, ricarica };
}
