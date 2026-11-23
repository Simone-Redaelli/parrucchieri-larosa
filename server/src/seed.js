const ORARI_STD = JSON.stringify({
  0: [], 1: [],
  2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']],
  5: [['09:00', '18:00']], 6: [['09:00', '18:00']],
});

const SERVIZI = [
  ['Piega corta', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 30, 15, null, 'da'],
  ['Piega media', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 40, 20, null, 'da'],
  ['Piega lunga', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 45, 25, null, 'da'],
  ['Acconciatura sera', 'Piega & Styling', 'Raccolti e acconciature per eventi e serate.', 60, 35, 50, 'range'],
  ['Taglio donna', 'Taglio', 'Consulenza, taglio su misura e definizione.', 45, 25, 30, 'range'],
  ['Taglio uomo', 'Taglio', 'Taglio classico o moderno, rifinito a forbice e macchinetta.', 30, 23, 25, 'range'],
  ['Taglio bimbo', 'Taglio', 'Per i più piccoli, veloce e senza stress.', 20, 20, null, 'fisso'],
  ['Colore ammonia free', 'Colore', 'Colorazione senza ammoniaca, delicata su cute e capelli.', 90, 35, null, 'da'],
  ['Colorazione vegetale', 'Colore', 'Vegan color a base di pigmenti vegetali.', 120, 60, null, 'da'],
  ['Color gloss', 'Colore', 'Tonalizzante: lucentezza e nutrimento su lunghezze e punte.', 30, 25, null, 'da'],
  ['Perfect white', 'Colore', 'Ridona luce e vita ai capelli bianchi naturali.', 30, 15, null, 'da'],
  ['New Collection Larosa', 'Colore', 'Colore ispirato alle tecniche Larosa. Prezzo da concordare in salone.', 120, null, null, 'convenire'],
  ['Balayage', 'Schiariture', 'Schiaritura sfumata a mano libera, effetto naturale.', 150, 60, null, 'da'],
  ['Meches con stagnola', 'Schiariture', 'Meches classiche con stagnola.', 120, 50, 120, 'range'],
  ['Schiariture parziali', 'Schiariture', 'Punti luce mirati per illuminare il viso.', 90, 35, null, 'da'],
  ['High light', 'Schiariture', 'Riflessi luminosi su tutta la chioma.', 120, 50, null, 'da'],
  ['Rituel Express', 'Trattamenti', 'Bain + 1 fusio-dose + 1 pre-styling.', 20, 15, null, 'fisso'],
  ['Rituel Intense', 'Trattamenti', 'Bain + 1 soin + trattamento cuoio capelluto + pre-styling.', 30, 25, null, 'fisso'],
  ['Rituel Unique', 'Trattamenti', 'Bain + fusio-dose + fonte di calore + soin + pre-styling.', 30, 25, null, 'fisso'],
  ['Rituel Exfoliant', 'Trattamenti', 'Pulizia profonda del cuoio capelluto.', 20, 15, null, 'fisso'],
  ['Trattamento Steam Pod', 'Trattamenti', 'Lisciatura a vapore che protegge la fibra.', 15, 5, null, 'fisso'],
  ['Ondulazione completa', 'Forma & Liscio', 'Permanente per onde e ricci duraturi.', 120, 70, null, 'da'],
  ['Laminazione capelli', 'Forma & Liscio', 'Capelli lisci, lucidi e disciplinati.', 90, 85, null, 'da'],
  ['Antigiallo uomo', 'Uomo', 'Man color: neutralizza i riflessi gialli.', 15, 10, null, 'da'],
];

export function seed(db) {
  const insSede = db.prepare(`INSERT INTO sedi (nome, indirizzo, cap, citta, telefono, telefono2, whatsapp, email, orari, ordine) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const a = insSede.run('Corso Potenza', 'Corso Potenza 119', '10149', 'Torino', '+39 351 738 5605', '011 733652', '+39 351 738 5605', 'larosabylagari@gmail.com', ORARI_STD, 1).lastInsertRowid;
  const b = insSede.run('Via Pomba', 'Via Giuseppe Pomba 27', '10123', 'Torino', '+39 344 757 2204', '+39 011 020 3257', '+39 344 757 2204', 'parrucchierilarosa.pomba@gmail.com', ORARI_STD, 2).lastInsertRowid;

  const insStaff = db.prepare(`INSERT INTO staff (nome, ruolo, bio, sede_id, colore, ordine) VALUES (?,?,?,?,?,?)`);
  insStaff.run('Pino', 'Hair stylist', 'Il riferimento storico del salone di Corso Potenza.', a, '#d4a017', 1);
  insStaff.run('Stylist Potenza', 'Hair stylist', 'Modifica nome e foto dal gestionale.', a, '#c2577a', 2);
  insStaff.run('Stylist Pomba', 'Hair stylist', 'Modifica nome e foto dal gestionale.', b, '#3f7cac', 3);
  insStaff.run('Colorist Pomba', 'Colorist', 'Modifica nome e foto dal gestionale.', b, '#5c9e6e', 4);

  const insServ = db.prepare(`INSERT INTO servizi (nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo, ordine) VALUES (?,?,?,?,?,?,?,?)`);
  SERVIZI.forEach((s, i) => insServ.run(...s, i + 1));
}
