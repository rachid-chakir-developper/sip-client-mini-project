import { createCadenceTone } from './toneEngine'

// Ringback tone heard by the caller while the far end is ringing
// (CEPT/Europe standard: 425 Hz, 1s ON / 4s OFF). Generated locally: works
// around the Opus codec limitation (PCM → Opus transcoding unavailable
// without a paid module), which prevents Asterisk from synthesizing a tone
// server-side for a WebRTC channel.
const STEPS = [
  { freq: 425, ms: 1000 },
  { freq: 0,   ms: 4000 },
]

const tone = createCadenceTone(STEPS)

export function useRingbackTone() {
  return tone
}
