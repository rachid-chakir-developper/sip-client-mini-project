import { createCadenceTone } from './toneEngine'

// Busy tone (CEPT/Europe standard: 425 Hz, 0.375s ON / 0.375s OFF),
// played to the caller when the far end rejects the call as busy.
const STEPS = [
  { freq: 425, ms: 375 },
  { freq: 0,   ms: 375 },
]

const tone = createCadenceTone(STEPS)

export function useBusyTone() {
  return tone
}
