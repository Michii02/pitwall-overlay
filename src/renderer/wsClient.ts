// Connects to pitwall-agent's local overlay bridge (ws://127.0.0.1:<port>).
// Plain browser-native WebSocket — no Electron API needed, so this file
// works unmodified whether it's loaded in an Electron renderer or a plain
// browser tab (e.g. a future OBS Browser Source page).

export interface OverlayFrame {
  type: 'frame'
  t: number
  steer: number
  throttle: number
  brake: number
}

const RECONNECT_DELAY_MS = 1000

export function connectTelemetryStream(
  url: string,
  onFrame: (f: OverlayFrame) => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (stopped) return
    ws = new WebSocket(url)
    ws.onopen = () => onStatus?.(true)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string)
        if (msg && msg.type === 'frame') onFrame(msg as OverlayFrame)
      } catch {
        // ignore malformed frames — best-effort stream
      }
    }
    const scheduleReconnect = () => {
      onStatus?.(false)
      if (stopped) return
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
    }
    ws.onclose = scheduleReconnect
    ws.onerror = () => ws?.close()
  }

  connect()

  return function disconnect() {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
