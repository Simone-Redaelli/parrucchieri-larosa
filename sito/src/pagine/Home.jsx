import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useSalone } from '../App.jsx';
import { prezzo, durata, totale, telLink, orariLeggibili, FOTO } from '../api.js';

export default function Home() {
  return (
    <>
      <Hero />
      <Salone />
      <Listino />
      <Galleria />
      <Estetica />
      <Sedi />
      <Chiusura />
      <BarraScelti />
    </>
  );
}

export function Ciocca({ className = '', statica = false }) {
  const ridotto = useReducedMotion();
  const { introFinita } = useSalone();
  const anim = ridotto || statica ? {} : { initial: { pathLength: 0 }, animate: { pathLength: introFinita ? 1 : 0 } };
  return (
    <svg className={`ciocca ${className}`} viewBox="0 0 1440 720" preserveAspectRatio="none" aria-hidden="true">
      <motion.path {...anim} transition={{ duration: 2.6, ease: [0.65, 0, 0.35, 1] }}
        d="M-40 676 C 260 712, 520 640, 760 652 S 1080 420, 1180 250 S 1360 30, 1500 20" fill="none" stroke="var(--prugna)" strokeWidth="1.6" />
      <motion.path {...anim} transition={{ duration: 2.6, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
        d="M-40 692 C 270 728, 530 662, 772 676 S 1094 446, 1198 276 S 1376 60, 1500 52" fill="none" stroke="var(--prugna)" strokeOpacity=".45" strokeWidth="1" />
      <motion.path {...anim} transition={{ duration: 2.6, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
        d="M-40 708 C 280 744, 540 684, 784 700 S 1108 472, 1216 302 S 1392 90, 1500 84" fill="none" stroke="var(--petalo)" strokeWidth="2.4" />
    </svg>
  );
}

function Foto({ src, alt, className = '', eager }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`arco ${className} ${ok ? '' : 'arco--vuoto'}`}>
      {ok && <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setOk(false)} />}
    </div>
  );
}

function Hero() {
  const { info } = useSalone();
  const sedi = info?.sedi || [];
  return (
    <section className="hero">
      <Ciocca />
      <div className="hero__dentro">
        <div className="hero__testo">
          <p className="hero__luogo">Parrucchieri a Torino dal 1990</p>
          <h1 className="hero__titolo">Il tuo aspetto è la miglior pubblicità del nostro successo.</h1>
          <p className="hero__sotto">
            Taglio, piega, colore e trattamenti in Corso Potenza e in Via Pomba.
            Scegli servizio, stylist e orario: in un minuto hai il tuo posto.
          </p>
          <div className="riga-bottoni">
            <Link to="/prenota" className="bottone bottone--scuro bottone--grande">Prenota online</Link>
            <a href="#listino" className="bottone bottone--linea bottone--grande">Guarda il listino</a>
          </div>
          <ul className="hero__telefoni">
            {sedi.map(s => <li key={s.id}>Chiama {s.nome}: <a href={telLink(s.telefono)}>{s.telefono}</a></li>)}
          </ul>
        </div>
        <div className="hero__immagini">
          <Foto src={FOTO[0]} alt="Un lavoro del salone Larosa" className="hero__foto1" eager />
          <Foto src={FOTO[1]} alt="Un lavoro del salone Larosa" className="hero__foto2" eager />
        </div>
      </div>
    </section>
  );
}

function Salone() {
  return (
    <section className="sezione salone" id="salone">
      <div className="salone__griglia">
        <h2 className="titolo-sezione">Un posto dove sederti, rilassarti e uscire diversa.</h2>
        <div className="salone__testo">
          <p>Larosa nasce in Corso Potenza 119 e da lì è cresciuto fino alla seconda sede di Via Pomba, in centro. Dal 1990 il metodo non è cambiato: prima si ascolta, poi si taglia.</p>
          <p>Il team porta in salone oltre quarant'anni di mestiere. Usiamo marchi e strumenti scelti per migliorare struttura e lucentezza del capello, non solo per l'effetto del giorno.</p>
          <p>Dopo due anni di prove in salone abbiamo lanciato la nostra linea di prodotti per capelli biologica. Chiedila al prossimo appuntamento.</p>
        </div>
      </div>
    </section>
  );
}

function Listino() {
  const { info, scelti, alterna } = useSalone();
  const categorie = useMemo(() => {
    const m = new Map();
    for (const s of info?.servizi || []) {
      if (!m.has(s.categoria)) m.set(s.categoria, []);
      m.get(s.categoria).push(s);
    }
    return [...m.entries()];
  }, [info]);
  const [attiva, setAttiva] = useState(null);
  const cat = attiva || categorie[0]?.[0];
  const lista = categorie.find(c => c[0] === cat)?.[1] || [];

  return (
    <section className="sezione listino" id="listino">
      <div className="listino__testa">
        <h2 className="titolo-sezione">Listino</h2>
        <p>Tocca <span className="piu-inline" aria-hidden="true">+</span> per aggiungere un servizio alla prenotazione. Le pieghe includono shampoo specifico, ristrutturante e finitura.</p>
      </div>
      <div className="listino__corpo">
        <div className="listino__categorie" role="tablist" aria-label="Categorie del listino">
          {categorie.map(([c, s]) => (
            <button key={c} role="tab" aria-selected={c === cat} className={c === cat ? 'attiva' : ''} onClick={() => setAttiva(c)}>
              <span>{c}</span><small>{s.length}</small>
            </button>
          ))}
        </div>
        <ul className="listino__voci" role="tabpanel">
          <AnimatePresence mode="popLayout" initial={false}>
            {lista.map(s => {
              const dentro = scelti.includes(s.id);
              return (
                <motion.li key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  className={`voce ${dentro ? 'voce--scelta' : ''}`}>
                  <div className="voce__testo">
                    <h3>{s.nome}</h3>
                    {s.descrizione && <p>{s.descrizione}</p>}
                  </div>
                  <span className="voce__durata">{durata(s.durata)}</span>
                  <span className="voce__prezzo">{prezzo(s)}</span>
                  {s.online ? (
                    <button className="voce__piu" onClick={() => alterna(s.id)} aria-pressed={dentro}
                      aria-label={dentro ? `Togli ${s.nome} dalla prenotazione` : `Aggiungi ${s.nome} alla prenotazione`}>
                      <span aria-hidden="true">{dentro ? '✓' : '+'}</span>
                    </button>
                  ) : <span className="voce__tel">al telefono</span>}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}

function BarraScelti() {
  const { info, scelti, impostaScelti } = useSalone();
  const nav = useNavigate();
  const servizi = (info?.servizi || []).filter(s => scelti.includes(s.id));
  const t = totale(servizi);
  const min = servizi.reduce((a, s) => a + s.durata, 0);
  return (
    <AnimatePresence>
      {servizi.length > 0 && (
        <motion.div className="barra-scelti" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
          <div className="barra-scelti__info">
            <strong>{servizi.length === 1 ? servizi[0].nome : `${servizi.length} servizi`}</strong>
            <span>{durata(min)}, {t.testo}</span>
          </div>
          <button className="barra-scelti__svuota" onClick={() => impostaScelti([])}>Svuota</button>
          <button className="bottone bottone--giallo" onClick={() => nav('/prenota')}>Scegli data e ora</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Galleria() {
  return (
    <section className="sezione galleria" aria-labelledby="galleria-titolo">
      <h2 className="titolo-sezione" id="galleria-titolo">Dal salone</h2>
      <div className="galleria__fila">
        {FOTO.map((f, i) => <Foto key={f} src={f} alt={`Lavoro del salone Larosa, foto ${i + 1}`} className={`galleria__foto galleria__foto--${i + 1}`} />)}
      </div>
    </section>
  );
}

const ESTETICA = ['Trattamenti viso', 'Trucco professionale', 'Colore ciglia', 'Manicure e pedicure', 'Ricostruzione unghie e gel', 'Depilazione', 'Corpo e massaggi', 'Counselling e olistico'];
const CERIMONIA = ['Sposa e cerimonia', 'Barber', 'Styling e acconciature'];

function Estetica() {
  const { info } = useSalone();
  return (
    <section className="sezione estetica">
      <div className="estetica__griglia">
        <div>
          <h2 className="titolo-sezione">Oltre i capelli</h2>
          <p className="estetica__intro">Per estetica, sposa e servizi su misura serve due parole prima di fissare l'orario. Chiama la sede che preferisci e ti organizziamo tutto.</p>
          <div className="riga-bottoni">
            {info?.sedi.map(s => <a key={s.id} className="bottone bottone--linea" href={telLink(s.telefono)}>Chiama {s.nome}</a>)}
          </div>
        </div>
        <ul className="estetica__lista">
          {[...CERIMONIA, ...ESTETICA].map(x => <li key={x}>{x}</li>)}
        </ul>
      </div>
    </section>
  );
}

function Sedi() {
  const { info } = useSalone();
  return (
    <section className="sezione sedi" id="sedi">
      <h2 className="titolo-sezione">Due sedi a Torino</h2>
      <div className="sedi__griglia">
        {info?.sedi.map(s => (
          <article key={s.id} className="sede">
            <div className="sede__mappa">
              <iframe title={`Mappa ${s.nome}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(`${s.indirizzo}, ${s.cap} ${s.citta}`)}&output=embed`} />
            </div>
            <div className="sede__corpo">
              <h3>{s.nome}</h3>
              <p className="sede__indirizzo">{s.indirizzo}, {s.cap} {s.citta}</p>
              <dl className="sede__orari">
                {orariLeggibili(s.orari).map(o => <div key={o.giorni}><dt>{o.giorni}</dt><dd>{o.orario}</dd></div>)}
              </dl>
              <p className="sede__contatti">
                <a href={telLink(s.telefono)}>{s.telefono}</a>
                {s.telefono2 && <a href={telLink(s.telefono2)}>{s.telefono2}</a>}
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </p>
              <div className="riga-bottoni">
                <Link className="bottone bottone--scuro" to={`/prenota?sede=${s.id}`}>Prenota qui</Link>
                <a className="bottone bottone--linea" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.indirizzo}, ${s.citta}`)}`}>Indicazioni</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Chiusura() {
  return (
    <section className="chiusura">
      <Ciocca className="ciocca--chiusura" statica />
      <div className="chiusura__dentro">
        <h2>Il prossimo appuntamento è a un minuto da qui.</h2>
        <Link to="/prenota" className="bottone bottone--giallo bottone--grande">Prenota online</Link>
      </div>
    </section>
  );
}
