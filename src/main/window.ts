import path from 'node:path'
import { BrowserWindow } from 'electron'
import { resolveInitialBounds } from './bounds'

export const WINDOW_SIZE = { width: 360, height: 200 }

export function createOverlayWindow(): BrowserWindow {
  const { x, y } = resolveInitialBounds(WINDOW_SIZE)

  const win = new BrowserWindow({
    x, y,
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false, // race-mode default; flipped when entering edit mode
    backgroundColor: '#00000000',
    webPreferences: {
      // Essential: Electron throttles rAF in unfocused windows, and this
      // window is unfocused by definition in race mode.
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true }) // race mode: mouse passes to the game
  win.loadFile(path.join(__dirname, '../renderer/index.html'))

  return win
}
