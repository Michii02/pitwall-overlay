import { globalShortcut, BrowserWindow, app } from 'electron'
import { saveBounds } from './bounds'

const TOGGLE_ACCELERATOR = 'CommandOrControl+Shift+O'

/** Registers the edit-mode toggle. Race mode (default) and edit mode are
 *  mutually exclusive by design — a click target is unreachable in
 *  click-through mode, so a global hotkey is the only way in/out. */
export function registerEditModeToggle(win: BrowserWindow): void {
  let editMode = false

  const apply = () => {
    win.setIgnoreMouseEvents(!editMode, editMode ? undefined : { forward: true })
    win.setFocusable(editMode)
    win.webContents.send('overlay:mode', editMode ? 'edit' : 'race')
    if (!editMode) {
      const b = win.getBounds()
      saveBounds({ x: b.x, y: b.y })
    }
  }

  globalShortcut.register(TOGGLE_ACCELERATOR, () => {
    editMode = !editMode
    apply()
  })

  // Unregistered on quit, not just on window close — a leaked binding
  // survives to the next launch and the hotkey silently stops responding.
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
