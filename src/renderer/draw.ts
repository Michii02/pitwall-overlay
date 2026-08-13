import { SIZE, readSample, latest, type TraceRingBuffer } from './ringBuffer.js'

const COLOR = {
  brake: '#E8002D',
  throttle: '#00D46A',
  steering: 'rgba(255,255,255,0.9)',
  grid: 'rgba(255,255,255,0.12)',
  background: 'rgba(13,13,13,0.55)',
}

const WHEEL_MAX_DEG = 120 // ±120° visual travel

export function startDrawLoop(canvas: HTMLCanvasElement, rb: TraceRingBuffer): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const cssWidth = canvas.clientWidth || 360
  const cssHeight = canvas.clientHeight || 200
  const dpr = window.devicePixelRatio || 1
  canvas.width = cssWidth * dpr
  canvas.height = cssHeight * dpr
  ctx.scale(dpr, dpr)

  let stopped = false
  let skip = false // 30fps cap: draw on every other rAF tick

  function drawWheel(cx: number, cy: number, r: number, steer: number) {
    const angleDeg = steer * WHEEL_MAX_DEG
    const angleRad = (angleDeg - 90) * (Math.PI / 180)

    ctx!.strokeStyle = COLOR.grid
    ctx!.lineWidth = 2
    ctx!.beginPath()
    ctx!.arc(cx, cy, r, 0, Math.PI * 2)
    ctx!.stroke()

    ctx!.strokeStyle = COLOR.steering
    ctx!.lineWidth = 3
    ctx!.lineCap = 'round'
    ctx!.beginPath()
    ctx!.moveTo(cx, cy)
    ctx!.lineTo(cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad))
    ctx!.stroke()

    ctx!.fillStyle = COLOR.steering
    ctx!.beginPath()
    ctx!.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx!.fill()
  }

  function drawTrace(x0: number, y0: number, w: number, h: number) {
    // Baseline
    ctx!.strokeStyle = COLOR.grid
    ctx!.lineWidth = 1
    ctx!.beginPath()
    ctx!.moveTo(x0, y0 + h)
    ctx!.lineTo(x0 + w, y0 + h)
    ctx!.stroke()

    const n = rb.count
    if (n < 2) return
    const step = w / (SIZE - 1)
    const xForLogical = (i: number) => x0 + w - (n - 1 - i) * step

    const drawChannel = (channel: 'throttle' | 'brake', color: string) => {
      ctx!.strokeStyle = color
      ctx!.lineWidth = 2
      ctx!.beginPath()
      for (let i = 0; i < n; i++) {
        const v = readSample(rb, channel, i)
        const x = xForLogical(i)
        const y = y0 + h - v * h
        if (i === 0) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
      }
      ctx!.stroke()
    }

    // Throttle first, brake drawn on top so trail-braking overlap stays visible.
    drawChannel('throttle', COLOR.throttle)
    drawChannel('brake', COLOR.brake)
  }

  function drawInstantBars(x: number, y0: number, h: number, cur: { throttle: number; brake: number }) {
    const barW = 8
    const gap = 4
    ctx!.fillStyle = COLOR.throttle
    ctx!.fillRect(x, y0 + h - cur.throttle * h, barW, cur.throttle * h)
    ctx!.fillStyle = COLOR.brake
    ctx!.fillRect(x + barW + gap, y0 + h - cur.brake * h, barW, cur.brake * h)
  }

  function frame() {
    if (stopped) return
    skip = !skip
    if (!skip) {
      const cur = latest(rb)
      ctx!.clearRect(0, 0, cssWidth, cssHeight)
      ctx!.fillStyle = COLOR.background
      ctx!.fillRect(0, 0, cssWidth, cssHeight)

      const wheelR = Math.min(28, cssHeight * 0.22)
      drawWheel(cssWidth / 2, wheelR + 8, wheelR, cur.steer)

      const traceTop = wheelR * 2 + 20
      const traceH = cssHeight - traceTop - 8
      drawTrace(8, traceTop, cssWidth - 8 - 28, traceH)
      drawInstantBars(cssWidth - 24, traceTop, traceH, cur)
    }
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
  return () => { stopped = true }
}
