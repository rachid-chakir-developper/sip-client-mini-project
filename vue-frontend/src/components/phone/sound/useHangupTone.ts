import { createCadenceTone } from './toneEngine'

// Short end-of-call beep, played once (not looped) when an established
// call ends.
const STEPS = [
  { freq: 480, ms: 300 },
]

const tone = createCadenceTone(STEPS, { loop: false })

export function useHangupTone() {
  return tone
}
