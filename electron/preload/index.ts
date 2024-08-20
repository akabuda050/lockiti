import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
});

// Expose vault-related APIs
contextBridge.exposeInMainWorld('vaultAPI', {
  createVault: (password) => ipcRenderer.invoke('create-vault', password),
  unlockVault: (password) => ipcRenderer.invoke('unlock-vault', password),

  
  getServiceInfo: (serviceName) => ipcRenderer.invoke('get-service-info', serviceName),

  
  getEntry: (serviceName) => ipcRenderer.invoke('get-password', serviceName),

  
  addPassword: (passwordData) => ipcRenderer.invoke('add-password', passwordData),

  
  deletePassword: (serviceName) => ipcRenderer.invoke('delete-password', serviceName),

  
  vaultExists: () => ipcRenderer.invoke('vault-exists'),
  openVault: () => ipcRenderer.invoke('vault-open'),
  copyToClipboard: (string) => ipcRenderer.invoke('copy-to-clipboard', string),

  
  logout: () => ipcRenderer.invoke('logout'),
});
