import { contextBridge, ipcRenderer } from 'electron'

// Minimal surface — only what edit-mode drag + mode-change notification need.
// Not a general domain-object bridge (this overlay has no such domain).
contextBridge.exposeInMainWorld('overlay', {
  onModeChange: (cb: (mode: 'race' | 'edit') => void) => {
    ipcRenderer.on('overlay:mode', (_e, mode) => cb(mode))
  },
  getBounds: () => ipcRenderer.invoke('window:getBounds'),
  moveWindow: (x: number, y: number) => ipcRenderer.send('window:move', { x, y }),
  dragEnd: () => ipcRenderer.send('window:dragEnd'),
})
