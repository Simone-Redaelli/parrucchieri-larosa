// Dati della versione dimostrativa (sito e gestionale su GitHub Pages)
export const ORARI = { 0: [], 1: [], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']], 5: [['09:00', '18:00']], 6: [['09:00', '18:00']] };

export const SEDI = [
  { id: 1, nome: 'Corso Potenza', indirizzo: 'Corso Potenza 119', cap: '10149', citta: 'Torino', telefono: '+39 351 738 5605', telefono2: '011 733652', whatsapp: '+39 351 738 5605', email: 'larosabylagari@gmail.com', orari: ORARI },
  { id: 2, nome: 'Via Pomba', indirizzo: 'Via Giuseppe Pomba 27', cap: '10123', citta: 'Torino', telefono: '+39 344 757 2204', telefono2: '+39 011 020 3257', whatsapp: '+39 344 757 2204', email: 'parrucchierilarosa.pomba@gmail.com', orari: ORARI },
];
export const STAFF = [
  { id: 1, nome: 'Pino', ruolo: 'Hair stylist', sede_id: 1, colore: '#d4a017', servizi: null },
  { id: 2, nome: 'Stylist Potenza', ruolo: 'Hair stylist', sede_id: 1, colore: '#c2577a', servizi: null },
  { id: 3, nome: 'Stylist Pomba', ruolo: 'Hair stylist', sede_id: 2, colore: '#3f7cac', servizi: null },
  { id: 4, nome: 'Colorist Pomba', ruolo: 'Colorist', sede_id: 2, colore: '#5c9e6e', servizi: null },
];
const S = (id, nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo) => ({ id, nome, categoria, descrizione, durata, prezzo, prezzo_max, tipo_prezzo, online: 1 });
export const SERVIZI = [
  S(1, 'Piega corta', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 30, 15, null, 'da'),
  S(2, 'Piega media', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 40, 20, null, 'da'),
  S(3, 'Piega lunga', 'Piega & Styling', 'Shampoo specifico, ristrutturante e finitura inclusi.', 45, 25, null, 'da'),
  S(4, 'Acconciatura sera', 'Piega & Styling', 'Raccolti e acconciature per eventi e serate.', 60, 35, 50, 'range'),
  S(5, 'Taglio donna', 'Taglio', 'Consulenza, taglio su misura e definizione.', 45, 25, 30, 'range'),
  S(6, 'Taglio uomo', 'Taglio', 'Taglio classico o moderno, rifinito a forbice e macchinetta.', 30, 23, 25, 'range'),
  S(7, 'Taglio bimbo', 'Taglio', 'Per i più piccoli, veloce e senza stress.', 20, 20, null, 'fisso'),
  S(8, 'Colore ammonia free', 'Colore', 'Colorazione senza ammoniaca, delicata su cute e capelli.', 90, 35, null, 'da'),
  S(9, 'Colorazione vegetale', 'Colore', 'Vegan color a base di pigmenti vegetali.', 120, 60, null, 'da'),
  S(10, 'Color gloss', 'Colore', 'Tonalizzante: lucentezza e nutrimento su lunghezze e punte.', 30, 25, null, 'da'),
  S(11, 'Perfect white', 'Colore', 'Ridona luce e vita ai capelli bianchi naturali.', 30, 15, null, 'da'),
  S(12, 'New Collection Larosa', 'Colore', 'Colore ispirato alle tecniche Larosa. Prezzo da concordare in salone.', 120, null, null, 'convenire'),
  S(13, 'Balayage', 'Schiariture', 'Schiaritura sfumata a mano libera, effetto naturale.', 150, 60, null, 'da'),
  S(14, 'Meches con stagnola', 'Schiariture', 'Meches classiche con stagnola.', 120, 50, 120, 'range'),
  S(15, 'Schiariture parziali', 'Schiariture', 'Punti luce mirati per illuminare il viso.', 90, 35, null, 'da'),
  S(16, 'High light', 'Schiariture', 'Riflessi luminosi su tutta la chioma.', 120, 50, null, 'da'),
  S(17, 'Rituel Express', 'Trattamenti', 'Bain + 1 fusio-dose + 1 pre-styling.', 20, 15, null, 'fisso'),
  S(18, 'Rituel Intense', 'Trattamenti', 'Bain + 1 soin + trattamento cuoio capelluto + pre-styling.', 30, 25, null, 'fisso'),
  S(19, 'Rituel Unique', 'Trattamenti', 'Bain + fusio-dose + fonte di calore + soin + pre-styling.', 30, 25, null, 'fisso'),
  S(20, 'Rituel Exfoliant', 'Trattamenti', 'Pulizia profonda del cuoio capelluto.', 20, 15, null, 'fisso'),
  S(21, 'Trattamento Steam Pod', 'Trattamenti', 'Lisciatura a vapore che protegge la fibra.', 15, 5, null, 'fisso'),
  S(22, 'Ondulazione completa', 'Forma & Liscio', 'Permanente per onde e ricci duraturi.', 120, 70, null, 'da'),
  S(23, 'Laminazione capelli', 'Forma & Liscio', 'Capelli lisci, lucidi e disciplinati.', 90, 85, null, 'da'),
  S(24, 'Antigiallo uomo', 'Uomo', 'Man color: neutralizza i riflessi gialli.', 15, 10, null, 'da'),
];
export const SALONE = { nome: 'Parrucchieri Larosa', slogan: 'Il tuo aspetto è la miglior pubblicità del nostro successo.', partita_iva: '13160320019', instagram: '', facebook: '', giorni_prenotabili: 60, conferma_automatica: false, annullamento_ore: 12 };

