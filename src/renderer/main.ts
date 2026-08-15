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
      setVisible: (visible: boolean) => void
    }
  }
}

const BRIDGE_URL = 'ws://127.0.0.1:20780'

// How long the WS connection must stay down before we hide the window — long
// enough to ride out the 1000ms reconnect loop's normal gaps without
// flickering, short enough that disabling the Settings toggle (which stops
// the local bridge server) is noticed promptly. Showing on reconnect is
// immediate — there's no reason to delay giving the window back.
const HIDE_AFTER_DISCONNECTED_MS = 6000

function main() {
  const canvas = document.getElementById('trace') as HTMLCanvasElement
  const container = document.getElementById('container') as HTMLElement
  const status = document.getElementById('status') as HTMLElement

  const rb = createRingBuffer()

  // Bridges "is the local telemetry WS reachable" to window visibility —
  // the only mechanism that makes the overlay respect the Settings toggle
  // (disabling it stops pitwall-agent's local bridge server) and stops it
  // from sitting on screen empty forever when the agent isn't running.
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  const clearHideTimer = () => {
    if (hideTimer != null) { clearTimeout(hideTimer); hideTimer = null }
  }

  connectTelemetryStream(
    BRIDGE_URL,
    (f) => writeSample(rb, f.steer, f.throttle, f.brake),
    (connected) => {
      status.textContent = connected ? '' : 'Waiting for PitWall Agent…'
      if (connected) {
        clearHideTimer()
        window.overlay?.setVisible(true)
      } else if (hideTimer == null) {
        hideTimer = setTimeout(() => {
          hideTimer = null
          window.overlay?.setVisible(false)
        }, HIDE_AFTER_DISCONNECTED_MS)
      }
    },
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
