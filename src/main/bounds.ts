import fs from 'node:fs'
import path from 'node:path'
import { app, screen } from 'electron'

export interface Bounds { x: number; y: number }

const BOUNDS_PATH = path.join(app.getPath('userData'), 'overlay-bounds.json')

export function loadBounds(): Bounds | null {
  try {
    const raw = fs.readFileSync(BOUNDS_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed
    return null
  } catch {
    return null
  }
}

export function saveBounds(b: Bounds): void {
  try {
    fs.writeFileSync(BOUNDS_PATH, JSON.stringify(b))
  } catch {
    // best-effort — losing a saved position is not fatal, just resets to default next launch
  }
}

/** True if the saved position (plus window size) intersects at least one current display's work area. */
export function validateBounds(b: Bounds, size: { width: number; height: number }): boolean {
  const displays = screen.getAllDisplays()
  return displays.some((d) => {
    const wa = d.workArea
    return b.x + size.width > wa.x && b.x < wa.x + wa.width
      && b.y + size.height > wa.y && b.y < wa.y + wa.height
  })
}

/** Bottom-left corner of the primary display's work area, with a small margin. */
export function defaultBounds(size: { width: number; height: number }): Bounds {
  const wa = screen.getPrimaryDisplay().workArea
  const margin = 24
  return { x: wa.x + margin, y: wa.y + wa.height - size.height - margin }
}

export function resolveInitialBounds(size: { width: number; height: number }): Bounds {
  const saved = loadBounds()
  if (saved && validateBounds(saved, size)) return saved
  return defaultBounds(size)
}
