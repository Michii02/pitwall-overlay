import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import type { EditModeController } from './editMode'

// 16×16 solid red PNG, base64 — matches PitWall's --red brand token. No
// external icon file needed; same embedding technique pitwall-agent's own
// tray already uses (src/tray/icon.ts) for the identical reason: one fewer
// asset to package/ship.
const ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJUlEQVR4AWMYqmDU/z8oGIz6/wcFg1H//6BgMOr/HxQMRkcAAAgOX/GAcCBjAAAAAElFTkSuQmCC'

/** System tray icon — the discoverable, reliable way to reposition or quit
 *  the overlay (the global hotkey in editMode.ts can silently fail to
 *  register if another app already holds that combo, and this window has
 *  no taskbar entry, no frame, and no menu bar of its own otherwise). */
export function createTray(win: BrowserWindow, editMode: EditModeController): Tray {
  const icon = nativeImage.createFromBuffer(Buffer.from(ICON_PNG_BASE64, 'base64'))
  const tray = new Tray(icon)
  tray.setToolTip('PitWall Overlay')

  const rebuildMenu = () => {
    const mode = editMode.getMode()
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'PitWall Overlay', enabled: false },
      { type: 'separator' },
      {
        label: mode === 'edit' ? 'Exit Edit Mode' : 'Edit Position…',
        type: 'checkbox',
        checked: mode === 'edit',
        click: () => editMode.toggle(),
      },
      { label: 'Hotkey: Ctrl+Shift+O', enabled: false },
      { type: 'separator' },
      { label: 'Quit PitWall Overlay', click: () => app.quit() },
    ]))
  }

  editMode.onChange(rebuildMenu)
  rebuildMenu()

  // Left-click toggles edit mode directly — a one-click shortcut to the
  // menu's own first action, matching how most tray apps treat a left click.
  tray.on('click', () => editMode.toggle())

  return tray
}
