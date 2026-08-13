import { ipcMain, BrowserWindow } from 'electron'
import { saveBounds } from './bounds'

/** Manual-drag IPC — only reachable while edit mode has setIgnoreMouseEvents(false),
 *  since race mode blocks all renderer mouse events at the window level (defense
 *  in depth, not the only gate). Deliberately not -webkit-app-region:drag, which
 *  jitters on Windows with transparent frameless windows. */
export function registerWindowIpc(win: BrowserWindow): void {
  ipcMain.handle('window:getBounds', () => win.getBounds())

  ipcMain.on('window:move', (_e, pos: { x: number; y: number }) => {
    win.setPosition(Math.round(pos.x), Math.round(pos.y))
  })

  ipcMain.on('window:dragEnd', () => {
    const b = win.getBounds()
    saveBounds({ x: b.x, y: b.y })
  })
}
