import { ipcRenderer, contextBridge } from 'electron'

// Expose vault-related APIs
contextBridge.exposeInMainWorld('vaultAPI', {
  createVault: (password: string) => ipcRenderer.invoke('create-vault', password),
  unlockVault: (password: string) => ipcRenderer.invoke('unlock-vault', password),


  getServiceInfo: (serviceName: string) => ipcRenderer.invoke('get-service-info', serviceName),


  getEntry: (serviceName: string) => ipcRenderer.invoke('get-entry', serviceName),


  createEntry: (passwordData: string) => ipcRenderer.invoke('add-entry', passwordData),


  deleteEntry: (serviceName: string) => ipcRenderer.invoke('delete-entry', serviceName),


  vaultExists: () => ipcRenderer.invoke('vault-exists'),
  openVault: () => ipcRenderer.invoke('vault-open'),
  copyToClipboard: (string: string) => ipcRenderer.invoke('copy-to-clipboard', string),


  logout: () => ipcRenderer.invoke('logout'),
});
