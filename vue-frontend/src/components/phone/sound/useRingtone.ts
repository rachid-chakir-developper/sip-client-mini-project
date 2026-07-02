import { ref } from 'vue'
import { createCadenceTone } from './toneEngine'

// If sounds/ringtone.mp3 exists and can be played, it is used as the
// incoming-call ringtone; otherwise this default oscillator-generated
// ringtone (950 Hz double pulse, "brring-brring") is played instead.
const RINGTONE_URL = new URL('./sounds/ringtone.mp3', import.meta.url).href

const FALLBACK_STEPS = [
  { freq: 950, ms: 400 },
  { freq: 0,   ms: 200 },
  { freq: 950, ms: 400 },
  { freq: 0,   ms: 2000 },
]

const fallbackTone = createCadenceTone(FALLBACK_STEPS)
const playing       = ref(false)

let audioEl:      HTMLAudioElement | null = null
let usingFallback = false

function switchToFallback(): void {
  if (usingFallback || !playing.value) return
  usingFallback = true
  fallbackTone.start()
}

export function useRingtone() {
  function start(): void {
    if (playing.value) return
    playing.value = true
    usingFallback = false

    audioEl = new Audio(RINGTONE_URL)
    audioEl.loop = true
    audioEl.addEventListener('error', switchToFallback)
    audioEl.play().catch(switchToFallback)
  }

  function stop(): void {
    if (!playing.value) return
    playing.value = false

    if (usingFallback) fallbackTone.stop()
    usingFallback = false

    if (audioEl) {
      audioEl.pause()
      audioEl.removeEventListener('error', switchToFallback)
      audioEl.src = ''
      audioEl = null
    }
  }

  return { playing, start, stop }
}
