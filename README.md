# Parrucchieri Larosa

Sito con prenotazioni online, gestionale, app per il telefono e app desktop. Tutto parla con un unico server Node.js.

| Parte | Cartella | Cosa fa |
|---|---|---|
| Server | `server/` | Node.js + Express + SQLite. API, calcolo degli orari liberi, notifiche in tempo reale e push |
| Sito | `sito/` | React. Home, listino interattivo, prenotazione in 5 passi, gestione/annullamento della prenotazione |
| Gestionale | `gestionale/` | React. Dashboard, agenda, prenotazioni, clienti, listino, staff, sedi e orari, impostazioni. Sul telefono si installa come app |
| App desktop | `desktop/` | Electron. Il gestionale come programma per Windows, Mac e Linux, con icona nell'area di notifica |

Serve **Node.js 22.13 o più recente** (il database usa `node:sqlite`, già incluso in Node).

## Demo online

Su GitHub Pages c'è una **versione dimostrativa** del sito: funziona tutto, ma le prenotazioni restano nel browser di chi le fa e non arrivano al salone. Si aggiorna da sola a ogni modifica della cartella `sito/`.

## Provarlo sul tuo PC

```bash
npm run installa
npm run build
npm start
```

- Sito: http://localhost:3000
- Gestionale: http://localhost:3000/gestionale/

Al primo accesso al gestionale crei l'account del **titolare**. Dopo, da Impostazioni → Chi può entrare, aggiungi gli accessi per lo staff.

Per vederlo pieno di dati finti (70 clienti, ~400 appuntamenti):

```bash
npm run demo -- --si
```

⚠️ Solo per prova: non lanciarlo sul server vero. Per ripartire da zero cancella la cartella `server/data`.

### Sviluppo con ricarica automatica

```bash
npm --prefix server run dev          # API su :3000
npm --prefix sito run dev            # sito su :5173
npm --prefix gestionale run dev      # gestionale su :5174
```

## Metterlo online (VPS)

Il sito non può più stare solo su Netlify: serve un server sempre acceso per prenotazioni e gestionale. Su una VPS Linux:

```bash
git clone <la-tua-repo> larosa && cd larosa
npm run installa && npm run build
sudo npm install -g pm2
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

Per l'HTTPS (obbligatorio per le notifiche sul telefono) installa [Caddy](https://caddyserver.com/docs/install) e usa il `Caddyfile` incluso: prende da solo il certificato.

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

Poi nel pannello del dominio punta i record **A** di `parrucchierilarosa.it` e `www` all'IP della VPS.

**Backup**: tutto sta in `server/data/larosa.db` (più i file `-wal` e `-shm`). Copia quella cartella ogni notte, ad esempio con cron:

```bash
0 3 * * * tar czf $HOME/backup-larosa-$(date +\%F).tgz -C $HOME/larosa/server data
```

Variabili d'ambiente opzionali: `PORT` (porta, 3000), `DATA_DIR` (dove salvare il database), `VAPID_SUBJECT` (email per le notifiche push, es. `mailto:larosabylagari@gmail.com`).

## App sul telefono (iPhone e Android)

Il gestionale è una web app installabile, niente App Store:

- **iPhone**: apri `https://www.parrucchierilarosa.it/gestionale/` con Safari → Condividi → *Aggiungi alla schermata Home*.
- **Android**: apri lo stesso indirizzo con Chrome → ⋮ → *Installa app*.

Poi in Impostazioni → *Notifiche anche con l'app chiusa*: a ogni prenotazione dal sito arriva la notifica sul telefono. Su iPhone serve iOS 16.4 o più recente e l'app aggiunta alla schermata Home.

## App desktop

Nella cartella `desktop/`. Al primo avvio chiede l'indirizzo del sito (es. `www.parrucchierilarosa.it`) e poi l'accesso.

- Chiudendo la finestra resta attiva vicino all'orologio e continua a mandare notifiche. Per chiuderla davvero: tasto destro sull'icona → Esci.
- Su Windows e Mac si può far partire all'accensione dal menu dell'icona.

**Creare gli installer**: carica il progetto su GitHub, poi vai su *Actions → App desktop → Run workflow*. In pochi minuti trovi negli *Artifacts*:
- Windows: `Larosa Gestionale Setup 1.0.0.exe`
- Mac: `Larosa Gestionale-1.0.0-universal.dmg` (Intel e Apple Silicon)
- Linux: `.AppImage` e `.deb`

Da un PC con lo stesso sistema puoi anche crearli a mano: `cd desktop && npm install && npm run dist:win` (oppure `dist:mac`, `dist:linux`).

L'app per Mac non è firmata con un certificato Apple: la prima volta fai **tasto destro → Apri**.

## Come funzionano le prenotazioni

1. La cliente sceglie sede, servizi, stylist (o "nessuna preferenza"), giorno e ora. Gli orari liberi sono calcolati da: orari della sede o dello stylist, durata dei servizi, appuntamenti già presi, ferie e chiusure, preavviso minimo.
2. La richiesta arriva nel gestionale **in tempo reale** (suono, notifica, contatore).
3. Premi *Conferma* o *Rifiuta*: subito dopo compare *Avvisa su WhatsApp* con il messaggio già scritto (i testi si cambiano da Impostazioni).
4. La cliente riceve il codice `LR-XXXXXXXX`: con quello aggiunge l'appuntamento al calendario e lo annulla da sola fino a 12 ore prima (modificabile).

Se attivi la **conferma automatica**, le prenotazioni dal sito sono confermate subito.

## Prima di andare online, da sistemare

- **Staff**: i nomi "Stylist Potenza", "Stylist Pomba" e "Colorist Pomba" sono segnaposto. Cambiali da Gestionale → Staff (Pino c'è già).
- **Durate**: le durate dei servizi sono stimate. Controllale da Gestionale → Listino, perché decidono gli orari liberi.
- **Foto**: ora le foto della galleria vengono caricate dal vecchio sito. Quando lo chiudete spariscono: copiale in `sito/public/foto/` e aggiorna l'elenco `FOTO` in `sito/src/api.js` (es. `'/foto/salone-1.jpg'`), poi `npm run build`.
- **Social**: inserisci i link di Instagram e Facebook da Impostazioni → Dati del sito.

## Struttura

```
server/       API Node.js (src/index.js avvia tutto, src/demo.js dati di prova)
sito/         sito pubblico React (src/pagine: Home, Prenota, Gestisci)
gestionale/   gestionale React + PWA (src/pagine)
desktop/      app Electron (main.js, preload.js)
condivisi/    logo vettoriale e icone usati da sito, gestionale e app
```
