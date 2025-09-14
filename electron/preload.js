const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  setContentProtection: (enable) => ipcRenderer.invoke('set-content-protection', enable),
  getDesktopSources: (options) => ipcRenderer.invoke('get-desktop-sources', options)
});

// Expose environment variables for Supabase
contextBridge.exposeInMainWorld('env', {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});