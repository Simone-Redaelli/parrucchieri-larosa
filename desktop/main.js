const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const TITOLO = 'Larosa Gestionale';
let finestra = null;
let tray = null;
let esci = false;

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.on('second-instance', () => mostra());
if (process.platform === 'win32') app.setAppUserModelId('it.parrucchierilarosa.gestionale');

const fileStato = () => path.join(app.getPath('userData'), 'finestra.json');
const leggiStato = () => { try { return JSON.parse(fs.readFileSync(fileStato(), 'utf8')); } catch { return {}; } };
const salvaStato = () => {
  if (!finestra) return;
  try { fs.writeFileSync(fileStato(), JSON.stringify({ ...finestra.getNormalBounds(), max: finestra.isMaximized() })); } catch {}
};

function mostra() {
  if (!finestra) return crea();
  if (finestra.isMinimized()) finestra.restore();
  finestra.show();
  finestra.focus();
}

function esterno(url) {
  if (/^(https?:|mailto:|tel:|whatsapp:)/i.test(url)) shell.openExternal(url);
}

function crea() {
  const s = leggiStato();
  finestra = new BrowserWindow({
    width: s.width || 1360, height: s.height || 880, x: s.x, y: s.y, minWidth: 380, minHeight: 560,
    title: TITOLO, backgroundColor: '#1A0D1E', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'tray-64.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (s.max) finestra.maximize();
  finestra.loadFile(path.join(__dirname, 'app', 'index.html'));
  finestra.once('ready-to-show', () => finestra.show());

  finestra.webContents.setWindowOpenHandler(({ url }) => { esterno(url); return { action: 'deny' }; });
  finestra.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://')) return;
    e.preventDefault();
    if (url.includes('/api/admin/esporta/')) finestra.webContents.downloadURL(url);
    else esterno(url);
  });
  finestra.webContents.session.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
  finestra.webContents.session.setPermissionRequestHandler((wc, permesso, ok) => ok(['notifications', 'clipboard-sanitized-write'].includes(permesso)));

  finestra.on('close', e => {
    salvaStato();
    if (!esci && tray) { e.preventDefault(); finestra.hide(); }
  });
  finestra.on('closed', () => { finestra = null; });
}

function creaTray() {
  const icona = nativeImage.createFromPath(path.join(__dirname, 'build', process.platform === 'darwin' ? 'tray-16.png' : 'tray-24.png'));
  tray = new Tray(icona);
  tray.setToolTip(TITOLO);
  const menu = () => Menu.buildFromTemplate([
    { label: 'Apri il gestionale', click: mostra },
    { type: 'separator' },
    ...(process.platform !== 'linux' ? [{
      label: 'Avvia all’accensione del computer', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: v => app.setLoginItemSettings({ openAtLogin: v.checked, openAsHidden: true }),
    }] : []),
    { label: 'Esci', click: () => { esci = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu());
  tray.on('click', mostra);
}

ipcMain.on('badge', (_e, n) => {
  n = Number(n) || 0;
  if (process.platform === 'darwin' || process.platform === 'linux') app.setBadgeCount(n);
  if (finestra && process.platform === 'win32') finestra.setTitle(n ? `${TITOLO} (${n} da confermare)` : TITOLO);
  if (tray) tray.setToolTip(n ? `${TITOLO}: ${n} richieste da confermare` : TITOLO);
});
ipcMain.on('mostra', mostra);
ipcMain.on('apri', (_e, url) => esterno(String(url)));

app.on('before-quit', () => { esci = true; salvaStato(); });
app.whenReady().then(() => {
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]) : null);
  crea();
  creaTray();
  app.on('activate', mostra);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit(); });
