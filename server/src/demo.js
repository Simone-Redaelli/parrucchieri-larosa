import { db, J } from './db.js';
import { adesso, addGiorni, giornoSett, hm } from './tempo.js';
import { nuovoCodice } from './prenotazioni.js';

if (!process.argv.includes('--si')) {
  console.log('Questo script riempie il database con clienti e appuntamenti DI PROVA.');
  console.log('Non usarlo sul database vero del salone. Per continuare: npm run demo -- --si');
  process.exit(0);
}

const NOMI = ['Giulia', 'Francesca', 'Chiara', 'Sara', 'Martina', 'Elena', 'Valentina', 'Alessia', 'Federica', 'Silvia', 'Paola', 'Roberta', 'Laura', 'Marta', 'Anna', 'Simona', 'Ilaria', 'Beatrice', 'Marco', 'Luca', 'Andrea', 'Davide', 'Matteo', 'Stefano'];
const COGNOMI = ['Rossi', 'Bianchi', 'Ferrero', 'Gallo', 'Costa', 'Fontana', 'Conti', 'Ricci', 'Bruno', 'Greco', 'Marino', 'Rinaldi', 'Colombo', 'Barbieri', 'Moretti', 'Lombardi', 'Esposito', 'Romano'];
const r = n => Math.floor(Math.random() * n);
const pick = a => a[r(a.length)];

const servizi = db.prepare('SELECT * FROM servizi WHERE attivo = 1').all();
const staff = db.prepare('SELECT * FROM staff WHERE attivo = 1').all();
const sedi = Object.fromEntries(db.prepare('SELECT * FROM sedi').all().map(s => [s.id, s]));

const insC = db.prepare('INSERT OR IGNORE INTO clienti (nome, cognome, telefono, email, creato_il) VALUES (?,?,?,?,?)');
const oggi = adesso().data;
for (let i = 0; i < 70; i++) {
  const n = pick(NOMI), c = pick(COGNOMI);
  insC.run(n, c, `+39 3${r(10)}${r(10)} ${100 + r(900)} ${1000 + r(9000)}`.replace(/\s/g, ''), Math.random() < .5 ? `${n}.${c}@esempio.it`.toLowerCase() : null, `${addGiorni(oggi, -r(120))} 10:00:00`);
}
const clienti = db.prepare('SELECT id FROM clienti').all().map(x => x.id);

const COMBO = [['Piega media'], ['Taglio donna', 'Piega media'], ['Colore ammonia free', 'Piega corta'], ['Taglio uomo'], ['Balayage', 'Piega lunga'], ['Piega lunga'], ['Color gloss', 'Piega media'], ['Rituel Intense', 'Piega corta'], ['Taglio donna'], ['Meches con stagnola', 'Piega media'], ['Taglio bimbo'], ['Laminazione capelli']];
const ins = db.prepare(`INSERT INTO prenotazioni (codice, cliente_id, sede_id, staff_id, data, inizio, fine, servizi, prezzo_stimato, prezzo_finale, stato, origine, note_cliente, creata_il) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let n = 0;
for (let d = -30; d <= 14; d++) {
  const data = addGiorni(oggi, d);
  for (const s of staff) {
    const orari = J(s.orari) || J(sedi[s.sede_id].orari, {});
    for (const [a, b] of orari[giornoSett(data)] || []) {
      let t = hm(a) + r(3) * 15;
      const fineTurno = hm(b);
      const densita = d < 0 ? .78 : d < 4 ? .65 : .35;
      while (t < fineTurno - 30) {
        const combo = pick(COMBO).map(nome => servizi.find(x => x.nome === nome)).filter(Boolean);
        const dur = combo.reduce((x, y) => x + y.durata, 0);
        if (t + dur > fineTurno) break;
        if (Math.random() < densita) {
          const snap = combo.map(x => ({ id: x.id, nome: x.nome, durata: x.durata, prezzo: x.prezzo, prezzo_max: x.prezzo_max, tipo_prezzo: x.tipo_prezzo }));
          const stima = snap.reduce((x, y) => x + (y.prezzo || 0), 0);
          let stato = d < 0 ? (Math.random() < .93 ? 'completata' : Math.random() < .5 ? 'no_show' : 'cancellata') : (d === 0 && t < adesso().min ? 'completata' : (Math.random() < (d > 0 ? .18 : 0) ? 'in_attesa' : 'confermata'));
          const finale = stato === 'completata' ? stima + pick([0, 0, 5, 10, 15, -5]) : null;
          ins.run(nuovoCodice(), pick(clienti), s.sede_id, s.id, data, t, t + dur, JSON.stringify(snap), stima, finale, stato, pick(['online', 'online', 'online', 'telefono', 'walkin']), Math.random() < .1 ? 'Capelli molto lunghi, grazie!' : null, `${addGiorni(data, -r(10) - 1)} ${10 + r(8)}:${10 + r(49)}:00`);
          n++;
        }
        t += dur + pick([0, 0, 15, 15, 30, 45]);
      }
    }
  }
}
console.log(`Creati ${clienti.length} clienti e ${n} appuntamenti di prova.`);
