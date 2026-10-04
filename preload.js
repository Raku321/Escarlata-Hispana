const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeAPI', {
  loadCreds: () => ipcRenderer.invoke('creds:load'),
  saveCreds: (accounts) => ipcRenderer.invoke('creds:save', accounts),
  setAwake: (on) => ipcRenderer.invoke('awake:set', on),
  setMinToTray: (on) => ipcRenderer.invoke('mintray:set', on),
  webhook: (url, text) => ipcRenderer.invoke('webhook:send', url, text),
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (on) => ipcRenderer.invoke('autostart:set', on),
  onAutoStart: (cb) => ipcRenderer.on('autostart', (_e, on) => cb(on)),
  onHotkey: (cb) => ipcRenderer.on('hotkey', (_e, k) => cb(k)),
  onJanela: (cb) => ipcRenderer.on('janela', (_e, v) => cb(!!v)), // janela visivel (true) ou minimizada/na bandeja (false)
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  onLocalNotify: (cb) => ipcRenderer.on('notify:local', (_e, data) => cb(data)),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', String(text || '')),
  readPreset: (name) => ipcRenderer.invoke('preset:read', name),
  saveBackup: (nome, conteudo, cabecalho) => ipcRenderer.invoke('backup:save', nome, conteudo, cabecalho),
  clearAccount: (i) => ipcRenderer.invoke('conta:limpar', i),
  fetchUserScript: (url) => ipcRenderer.invoke('userscript:fetch', url),
  // versao do app: vem do processo principal (a UA nao carrega mais o token del cliente, e o
  // preload roda em sandbox, entao require de arquivo local nao e confiavel)
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  checkUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, status) => cb(status)),
  appVersion: (() => { try { return ipcRenderer.sendSync('app:version'); } catch { return ''; } })()
});
