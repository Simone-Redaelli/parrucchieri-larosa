const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('larosaDesktop', {
  versione: '1.0.0',
  piattaforma: process.platform,
  badge: n => ipcRenderer.send('badge', n),
  mostra: () => ipcRenderer.send('mostra'),
  apri: url => ipcRenderer.send('apri', url),
});
