// Fixed-size ring buffer for the rolling 5s trace. Allocated once; the
// WebSocket message handler only ever writes (writeSample), the draw loop
// only ever reads (readSample/latest) — enforced by this module boundary,
// not by convention.

export const WINDOW_SECONDS = 5
export const SAMPLE_RATE = 60
export const SIZE = WINDOW_SECONDS * SAMPLE_RATE // 300

export interface TraceRingBuffer {
  steer: Float32Array
  throttle: Float32Array
  brake: Float32Array
  writeIndex: number
  /** Samples written so far, capped at SIZE — lets the draw loop know how
   *  much of the buffer is real data before 5s of history has accumulated. */
  count: number
}

export function createRingBuffer(): TraceRingBuffer {
  return {
    steer: new Float32Array(SIZE),
    throttle: new Float32Array(SIZE),
    brake: new Float32Array(SIZE),
    writeIndex: 0,
    count: 0,
  }
}

export function writeSample(rb: TraceRingBuffer, steer: number, throttle: number, brake: number): void {
  rb.steer[rb.writeIndex] = steer
  rb.throttle[rb.writeIndex] = throttle
  rb.brake[rb.writeIndex] = brake
  rb.writeIndex = (rb.writeIndex + 1) % SIZE
  if (rb.count < SIZE) rb.count++
}

/** logicalIndex: 0 = oldest visible sample … count-1 = newest. */
export function readSample(rb: TraceRingBuffer, channel: 'steer' | 'throttle' | 'brake', logicalIndex: number): number {
  const physical = (rb.writeIndex - rb.count + logicalIndex + SIZE * 2) % SIZE
  return rb[channel][physical]
}

/** Most-recently-written sample, for the instantaneous pedal/wheel readout. */
export function latest(rb: TraceRingBuffer): { steer: number; throttle: number; brake: number } {
  if (rb.count === 0) return { steer: 0, throttle: 0, brake: 0 }
  const physical = (rb.writeIndex - 1 + SIZE) % SIZE
  return { steer: rb.steer[physical], throttle: rb.throttle[physical], brake: rb.brake[physical] }
}
