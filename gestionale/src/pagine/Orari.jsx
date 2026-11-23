import { Plus, X, Copy } from 'lucide-react';

const GIORNI = [[1, 'Lunedì'], [2, 'Martedì'], [3, 'Mercoledì'], [4, 'Giovedì'], [5, 'Venerdì'], [6, 'Sabato'], [0, 'Domenica']];

export default function OrariSettimana({ valore, onCambia, sola }) {
  const o = valore || {};
  const imposta = (g, lista) => onCambia({ ...o, [g]: lista });
  const copia = g => onCambia(Object.fromEntries(GIORNI.map(([d]) => [d, (o[d] || []).length ? o[g] : o[d] || []])));
  return (
    <div className="orari-sett">
      {GIORNI.map(([g, nome]) => {
        const lista = o[g] || [];
        const aperto = lista.length > 0;
        return (
          <div key={g} className={`orari-sett__giorno ${aperto ? '' : 'chiuso'}`}>
            <label className="orari-sett__nome">
              <input type="checkbox" checked={aperto} disabled={sola} onChange={e => imposta(g, e.target.checked ? [['09:00', '18:00']] : [])} />
              <span>{nome}</span>
            </label>
            <div className="orari-sett__fasce">
              {!aperto && <span className="muto">Chiuso</span>}
              {lista.map(([a, b], i) => (
                <span key={i} className="fascia">
                  <input type="time" step="900" value={a} disabled={sola} onChange={e => imposta(g, lista.map((x, j) => j === i ? [e.target.value, x[1]] : x))} aria-label={`${nome} apertura`} />
                  <span>–</span>
                  <input type="time" step="900" value={b} disabled={sola} onChange={e => imposta(g, lista.map((x, j) => j === i ? [x[0], e.target.value] : x))} aria-label={`${nome} chiusura`} />
                  {!sola && lista.length > 1 && <button className="icona-btn icona-btn--p" onClick={() => imposta(g, lista.filter((_, j) => j !== i))} aria-label="Togli fascia"><X size={15} /></button>}
                </span>
              ))}
            </div>
            {!sola && aperto && (
              <div className="orari-sett__azioni">
                {lista.length < 3 && <button className="link" onClick={() => imposta(g, [...lista, [lista[lista.length - 1][1], '19:00']])}><Plus size={14} /> Fascia</button>}
                <button className="link" onClick={() => copia(g)} title="Copia questi orari sugli altri giorni aperti"><Copy size={14} /> Copia</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
