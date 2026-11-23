import webpush from 'web-push';
import { db, getSetting, setSetting } from './db.js';

const clienti = new Set();

export function sse(req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`event: ciao\ndata: {}\n\n`);
  const c = { res, utente: req.utente };
  clienti.add(c);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clienti.delete(c); });
}

export function emetti(tipo, dati) {
  const msg = `event: ${tipo}\ndata: ${JSON.stringify(dati)}\n\n`;
  for (const c of clienti) c.res.write(msg);
}

if (!getSetting('vapid_public')) {
  const k = webpush.generateVAPIDKeys();
  setSetting('vapid_public', k.publicKey);
  setSetting('vapid_private', k.privateKey);
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:larosabylagari@gmail.com', getSetting('vapid_public'), getSetting('vapid_private'));

export const chiavePush = () => getSetting('vapid_public');

export async function inviaPush(payload) {
  const subs = db.prepare('SELECT id, dati FROM push').all();
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification(JSON.parse(s.dati), JSON.stringify(payload), { TTL: 3600 }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push WHERE id = ?').run(s.id); }
  }));
}
