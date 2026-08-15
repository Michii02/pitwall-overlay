import { globalShortcut, BrowserWindow, app } from 'electron'
import { saveBounds } from './bounds'

const TOGGLE_ACCELERATOR = 'CommandOrControl+Shift+O'

export interface EditModeController {
  toggle: () => void
  getMode: () => 'race' | 'edit'
  onChange: (cb: (mode: 'race' | 'edit') => void) => void
}

/** Registers the edit-mode toggle. Race mode (default) and edit mode are
 *  mutually exclusive by design — a click target is unreachable in
 *  click-through mode, so a global hotkey (or the tray menu, which calls
 *  the same toggle) is the only way in/out. Shared between the hotkey and
 *  the tray menu so both stay in sync with a single source of truth. */
export function registerEditModeToggle(win: BrowserWindow): EditModeController {
  let editMode = false
  const listeners: Array<(mode: 'race' | 'edit') => void> = []

  const apply = () => {
    // Entering edit mode always makes the window visible — otherwise a
    // window that auto-hid itself while disconnected (see renderer/main.ts)
    // would be undraggable precisely when the user most needs to move it.
    if (editMode) win.show()
    win.setIgnoreMouseEvents(!editMode, editMode ? undefined : { forward: true })
    win.setFocusable(editMode)
    win.webContents.send('overlay:mode', editMode ? 'edit' : 'race')
    if (!editMode) {
      const b = win.getBounds()
      saveBounds({ x: b.x, y: b.y })
    }
    for (const cb of listeners) cb(editMode ? 'edit' : 'race')
  }

  const toggle = () => {
    editMode = !editMode
    apply()
  }

  const registered = globalShortcut.register(TOGGLE_ACCELERATOR, toggle)
  if (!registered) {
    // Electron silently no-ops if another app already holds this exact
    // combo — the tray menu (main/tray.ts) is the reliable fallback path,
    // so this is a soft warning, not a hard failure.
    console.warn(`[pitwall-overlay] Could not register global hotkey ${TOGGLE_ACCELERATOR} (already in use by another app) — use the tray menu instead.`)
  }

  // Unregistered on quit, not just on window close — a leaked binding
  // survives to the next launch and the hotkey silently stops responding.
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  return {
    toggle,
    getMode: () => (editMode ? 'edit' : 'race'),
    onChange: (cb) => listeners.push(cb),
  }
}
