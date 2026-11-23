import crypto from 'node:crypto';
import { db, getSetting } from './db.js';

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${h}`;
}
export function verificaPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const calc = crypto.scryptSync(pw, salt, 64);
  const buf = Buffer.from(h, 'hex');
  return buf.length === calc.length && crypto.timingSafeEqual(buf, calc);
}

const b64 = s => Buffer.from(s).toString('base64url');
export function firmaToken(utente, giorni = 30) {
  const payload = b64(JSON.stringify({ id: utente.id, r: utente.ruolo, exp: Date.now() + giorni * 864e5 }));
  const sig = crypto.createHmac('sha256', getSetting('secret')).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function leggiToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const atteso = crypto.createHmac('sha256', getSetting('secret')).update(payload).digest('base64url');
  if (sig.length !== atteso.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(atteso))) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (p.exp < Date.now()) return null;
    return db.prepare('SELECT id, nome, email, ruolo, staff_id FROM utenti WHERE id = ?').get(p.id) || null;
  } catch { return null; }
}

export function richiediLogin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.token;
  const u = leggiToken(token);
  if (!u) return res.status(401).json({ errore: 'Sessione scaduta, accedi di nuovo.' });
  req.utente = u;
  next();
}
export function soloTitolare(req, res, next) {
  if (req.utente?.ruolo !== 'titolare') return res.status(403).json({ errore: 'Solo il titolare può farlo.' });
  next();
}
