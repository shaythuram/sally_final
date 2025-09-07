// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      setContentProtection: (enable: boolean) => Promise<void>
    }
  }
}

export {}
