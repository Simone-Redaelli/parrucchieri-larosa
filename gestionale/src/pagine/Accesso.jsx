import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { get, post, serveServer, server, impostaServer } from '../api.js';
import { Rosa, Campo } from '../ui.jsx';

export default function Accesso({ onEntra }) {
  const chiediServer = serveServer();
  const [indirizzo, setIndirizzo] = useState(server());
  const [stato, setStato] = useState(null);
  const [f, setF] = useState({ nome: '', email: '', password: '' });
  const [errore, setErrore] = useState(null);
  const [invio, setInvio] = useState(false);

  const verifica = async () => {
    setErrore(null); setStato(null);
    if (chiediServer && !server()) { setStato({ serve: true }); return; }
    try { setStato(await get('/admin/stato')); }
    catch (e) { setStato({ serve: chiediServer }); setErrore(chiediServer ? 'Non riesco a collegarmi a questo indirizzo. Controlla che sia giusto.' : e.message); }
  };
  useEffect(() => { verifica(); }, []);

  const cambia = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function invia(e) {
    e.preventDefault();
    setErrore(null); setInvio(true);
    try {
      if (chiediServer && (stato?.serve || indirizzo !== server())) {
        impostaServer(indirizzo);
        const s = await get('/admin/stato').catch(() => null);
        if (!s) throw new Error('Non riesco a collegarmi a questo indirizzo. Controlla che sia giusto.');
        setStato(s); setInvio(false); return;
      }
      const r = stato?.configurato ? await post('/admin/login', { email: f.email, password: f.password }) : await post('/admin/setup', f);
      onEntra(r.token, r.utente);
    } catch (err) { setErrore(err.message); }
    finally { setInvio(false); }
  }

  const fase = !stato ? 'carica' : stato.serve ? 'server' : stato.configurato ? 'login' : 'setup';

  return (
    <div className="accesso">
      <motion.form className="accesso__carta" onSubmit={invia} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Rosa className="accesso__rosa" oro />
        <h1>{fase === 'setup' ? 'Crea il tuo account' : fase === 'server' ? 'Collega il salone' : 'Bentornato'}</h1>
        <p className="accesso__sotto">
          {fase === 'setup' && 'È il primo accesso: questo account sarà il titolare e potrà aggiungere lo staff.'}
          {fase === 'server' && 'Scrivi l’indirizzo del sito del salone. Lo chiediamo solo la prima volta.'}
          {fase === 'login' && 'Accedi al gestionale di Larosa.'}
          {fase === 'carica' && 'Mi collego al server…'}
        </p>
        {fase === 'server' && (
          <Campo etichetta="Indirizzo del sito"><input autoFocus required value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="www.parrucchierilarosa.it" inputMode="url" /></Campo>
        )}
        {fase === 'setup' && <Campo etichetta="Il tuo nome"><input required value={f.nome} onChange={cambia('nome')} autoComplete="name" /></Campo>}
        {(fase === 'login' || fase === 'setup') && <>
          <Campo etichetta="Email"><input required type="email" value={f.email} onChange={cambia('email')} autoComplete="username" autoFocus={fase === 'login'} /></Campo>
          <Campo etichetta="Password" aiuto={fase === 'setup' ? 'Almeno 8 caratteri.' : undefined}><input required type="password" minLength={fase === 'setup' ? 8 : undefined} value={f.password} onChange={cambia('password')} autoComplete={fase === 'setup' ? 'new-password' : 'current-password'} /></Campo>
        </>}
        {errore && <p className="errore" role="alert">{errore}</p>}
        {fase !== 'carica' && <button className="btn btn--oro btn--pieno btn--grande" disabled={invio}>{invio ? 'Attendi…' : fase === 'setup' ? 'Crea account ed entra' : fase === 'server' ? 'Collega' : 'Accedi'}</button>}
        {chiediServer && fase === 'login' && <button type="button" className="link" onClick={() => setStato({ serve: true })}>Cambia server ({server().replace(/^https?:\/\//, '')})</button>}
      </motion.form>
    </div>
  );
}
