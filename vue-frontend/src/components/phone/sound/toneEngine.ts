import { ref } from 'vue'

export interface ToneStep {
  /** Frequency in Hz, or 0 for silence. */
  freq: number
  /** Duration of this step in milliseconds. */
  ms: number
}

export interface ToneOptions {
  gain?: number
  /** Repeat the step sequence forever. Default true. */
  loop?: boolean
}

// Shared Web Audio engine behind every generated call-progress tone
// (ringback, busy, hangup, reconnect…): plays a repeating (or one-shot)
// sequence of frequency/duration steps through a single oscillator.
export function createCadenceTone(steps: ToneStep[], options: ToneOptions = {}) {
  const gainLevel = options.gain ?? 0.15
  const loop       = options.loop ?? true

  const playing = ref(false)

  let audioContext: AudioContext | null = null
  let oscillator:   OscillatorNode | null = null
  let gainNode:     GainNode | null = null
  let timer:        ReturnType<typeof setTimeout> | null = null

  function ensureContext(): AudioContext {
    if (!audioContext) audioContext = new AudioContext()
    return audioContext
  }

  function scheduleSteps(ctx: AudioContext, osc: OscillatorNode, gain: GainNode): void {
    let index = 0
    const tick = () => {
      if (!playing.value) return
      if (index >= steps.length) {
        if (!loop) {
          stop()
          return
        }
        index = 0
      }
      const step = steps[index]
      index++
      if (step.freq > 0) osc.frequency.setValueAtTime(step.freq, ctx.currentTime)
      gain.gain.setValueAtTime(step.freq > 0 ? gainLevel : 0, ctx.currentTime)
      timer = setTimeout(tick, step.ms)
    }
    tick()
  }

  function start(): void {
    if (playing.value) return
    playing.value = true

    const ctx = ensureContext()
    oscillator = ctx.createOscillator()
    gainNode   = ctx.createGain()
    gainNode.gain.value = 0
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start()

    scheduleSteps(ctx, oscillator, gainNode)
  }

  function stop(): void {
    if (!playing.value) return
    playing.value = false

    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    oscillator?.stop()
    oscillator?.disconnect()
    gainNode?.disconnect()
    oscillator = null
    gainNode   = null
  }

  return { playing, start, stop }
}
