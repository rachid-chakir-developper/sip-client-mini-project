import { ref } from 'vue'

// Tonalité de retour d'appel générée localement (norme CEPT/Europe : 425 Hz,
// cadence 1 s ON / 4 s OFF). Indépendante d'Asterisk : contourne la limitation
// du codec Opus (transcodage PCM → Opus non disponible sans module payant),
// qui empêche Asterisk de synthétiser une tonalité côté serveur pour un canal WebRTC.
const FREQUENCY_HZ = 425
const ON_MS        = 1000
const OFF_MS       = 2000
const GAIN         = 0.15

let audioContext: AudioContext | null = null
let oscillator:   OscillatorNode | null = null
let gainNode:     GainNode | null = null
let cadenceTimer: ReturnType<typeof setTimeout> | null = null

const playing = ref(false)

function ensureContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function scheduleCadence(ctx: AudioContext, gain: GainNode): void {
  let on = true
  const tick = () => {
    if (!playing.value) return
    gain.gain.setValueAtTime(on ? GAIN : 0, ctx.currentTime)
    cadenceTimer = setTimeout(tick, on ? ON_MS : OFF_MS)
    on = !on
  }
  tick()
}

export function useRingbackTone() {
  function start(): void {
    if (playing.value) return
    playing.value = true

    const ctx = ensureContext()
    oscillator = ctx.createOscillator()
    gainNode   = ctx.createGain()
    oscillator.frequency.value = FREQUENCY_HZ
    gainNode.gain.value        = 0
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start()

    scheduleCadence(ctx, gainNode)
  }

  function stop(): void {
    if (!playing.value) return
    playing.value = false

    if (cadenceTimer) {
      clearTimeout(cadenceTimer)
      cadenceTimer = null
    }
    oscillator?.stop()
    oscillator?.disconnect()
    gainNode?.disconnect()
    oscillator = null
    gainNode   = null
  }

  return { playing, start, stop }
}
