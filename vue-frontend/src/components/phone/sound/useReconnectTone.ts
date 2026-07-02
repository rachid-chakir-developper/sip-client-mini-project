import { createCadenceTone } from './toneEngine'

// Connection-lost alert: three quick beeps then a pause, repeating while the
// SIP connection has dropped and is being re-established.
const STEPS = [
  { freq: 900, ms: 150 },
  { freq: 0,   ms: 100 },
  { freq: 900, ms: 150 },
  { freq: 0,   ms: 100 },
  { freq: 900, ms: 150 },
  { freq: 0,   ms: 3000 },
]

const tone = createCadenceTone(STEPS)

export function useReconnectTone() {
  return tone
}
