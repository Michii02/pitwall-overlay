import { app } from 'electron'
import { createOverlayWindow } from './window'
import { registerEditModeToggle } from './editMode'
import { registerWindowIpc } from './ipc'

// Cheap insurance against a double-launch — no shared exclusive resource
// like a UDP port here, but still worth guarding.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.whenReady().then(() => {
    const win = createOverlayWindow()
    registerWindowIpc(win)
    registerEditModeToggle(win)
  })

  app.on('window-all-closed', () => app.quit())
}
