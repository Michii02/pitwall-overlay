import { connectTelemetryStream } from './wsClient.js'
import { createRingBuffer, writeSample } from './ringBuffer.js'
import { startDrawLoop } from './draw.js'

// Exposed by preload/index.ts only inside Electron — undefined in a plain
// browser tab (e.g. a future OBS Browser Source page), so every use below
// is optional-chained and this file works either way.
declare global {
  interface Window {
    overlay?: {
      onModeChange: (cb: (mode: 'race' | 'edit') => void) => void
      getBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
      moveWindow: (x: number, y: number) => void
      dragEnd: () => void
    }
  }
}

const BRIDGE_URL = 'ws://127.0.0.1:20780'

function main() {
  const canvas = document.getElementById('trace') as HTMLCanvasElement
  const container = document.getElementById('container') as HTMLElement
  const status = document.getElementById('status') as HTMLElement

  const rb = createRingBuffer()

  connectTelemetryStream(
    BRIDGE_URL,
    (f) => writeSample(rb, f.steer, f.throttle, f.brake),
    (connected) => { status.textContent = connected ? '' : 'Waiting for PitWall Agent…' },
  )

  startDrawLoop(canvas, rb)

  let editMode = false
  window.overlay?.onModeChange((mode) => {
    editMode = mode === 'edit'
    container.classList.toggle('edit-mode', editMode)
  })

  // Manual drag (screen-delta based), only meaningful in edit mode — race
  // mode already blocks all renderer mouse events via setIgnoreMouseEvents,
  // so this handler being present but inert there is defense in depth, not
  // the only gate. Not -webkit-app-region:drag, which jitters on Windows
  // with transparent frameless windows.
  let dragging = false
  let startScreenX = 0
  let startScreenY = 0
  let startBounds = { x: 0, y: 0 }

  container.addEventListener('mousedown', async (e) => {
    if (!editMode || !window.overlay) return
    dragging = true
    startScreenX = e.screenX
    startScreenY = e.screenY
    startBounds = await window.overlay.getBounds()
  })

  window.addEventListener('mousemove', (e) => {
    if (!dragging || !window.overlay) return
    const dx = e.screenX - startScreenX
    const dy = e.screenY - startScreenY
    window.overlay.moveWindow(startBounds.x + dx, startBounds.y + dy)
  })

  window.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    window.overlay?.dragEnd()
  })
}

main()
