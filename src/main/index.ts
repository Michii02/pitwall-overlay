import { app } from 'electron'
import { createOverlayWindow } from './window'
import { registerEditModeToggle } from './editMode'
import { registerWindowIpc } from './ipc'
import { createTray } from './tray'

// Cheap insurance against a double-launch — no shared exclusive resource
// like a UDP port here, but still worth guarding.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.whenReady().then(() => {
    const win = createOverlayWindow()
    registerWindowIpc(win)
    const editMode = registerEditModeToggle(win)
    // Held for the app's lifetime — Electron garbage-collects (and silently
    // removes) a Tray with no surviving reference to it.
    createTray(win, editMode)
  })

  app.on('window-all-closed', () => app.quit())
}
