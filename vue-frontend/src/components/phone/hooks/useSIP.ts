import { ref, onUnmounted } from 'vue'
import {
  UserAgent,
  Registerer,
  Inviter,
  Invitation,
  SessionState,
  RegistererState,
} from 'sip.js'
import type { Session } from 'sip.js'
import { useRingbackTone }   from '../sound/useRingbackTone'
import { useRingtone }       from '../sound/useRingtone'
import { useBusyTone }       from '../sound/useBusyTone'
import { useHangupTone }     from '../sound/useHangupTone'
import { useReconnectTone }  from '../sound/useReconnectTone'

interface SIPCredentials {
  extension:    string
  password:     string
  server:       string
  ws_url:       string
  display_name?: string
}

export interface CallHistoryEntry {
  id:         string
  direction: 'incoming' | 'outgoing' | 'missed'
  extension:  string
  callerName: string | null
  timestamp:  number
  duration:   number | null
}

const HISTORY_LIMIT = 30

export function useSIP() {
  const ua            = ref<UserAgent | null>(null)
  const session       = ref<Session | null>(null)
  const status        = ref('disconnected')
  const caller        = ref('')
  const muted         = ref(false)
  const speakerMuted  = ref(false)
  const callStartedAt = ref<number | null>(null)
  const answering     = ref(false)
  const callNotice    = ref<string | null>(null)
  const history       = ref<CallHistoryEntry[]>([])

  let noticeTimer: ReturnType<typeof setTimeout> | null = null
  let historyStorageKey = ''

  // Purely client-side call log (last 30 calls), scoped per extension so a
  // shared browser never mixes histories between SIP accounts. No backend
  // involved — this is the whole point of keeping the widget backend-agnostic.
  function loadHistory(extension: string): void {
    historyStorageKey = `sip-phone:history:${extension}`
    try {
      const raw = localStorage.getItem(historyStorageKey)
      history.value = raw ? JSON.parse(raw) : []
    } catch {
      history.value = []
    }
  }

  function persistHistory(): void {
    if (!historyStorageKey) return
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(history.value))
    } catch {
      // Storage full/unavailable (e.g. private browsing) — history just
      // won't persist across reloads, which is a fine degradation.
    }
  }

  function pushHistoryEntry(entry: CallHistoryEntry): void {
    history.value = [entry, ...history.value].slice(0, HISTORY_LIMIT)
    persistHistory()
  }

  function deleteHistoryEntry(id: string): void {
    history.value = history.value.filter(e => e.id !== id)
    persistHistory()
  }

  function clearHistory(): void {
    history.value = []
    persistHistory()
  }

  // Shows a self-dismissing banner (i18n key), like a phone's "Busy" / "Call
  // declined" toast. `durationMs` controls how long it stays visible.
  function showNotice(key: string, durationMs = 4000): void {
    callNotice.value = key
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => {
      callNotice.value = null
      noticeTimer = null
    }, durationMs)
  }

  // Reassigned on every (re)registration attempt; referenced by the
  // reconnection logic below.
  let registerer: Registerer | null = null
  let reconnectTimer:    ReturnType<typeof setTimeout> | null = null
  let reRegisterTimer:   ReturnType<typeof setTimeout> | null = null
  let registerTimeout:   ReturnType<typeof setTimeout> | null = null

  const RETRY_INTERVAL_MS   = 5000
  const REGISTER_TIMEOUT_MS = 8000

  function clearRegisterTimeout(): void {
    if (registerTimeout) {
      clearTimeout(registerTimeout)
      registerTimeout = null
    }
  }

  function stopReconnecting(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (reRegisterTimer) {
      clearTimeout(reRegisterTimer)
      reRegisterTimer = null
    }
    clearRegisterTimeout()
  }

  // A fresh Registerer per attempt — reusing one across a failed/stuck
  // attempt risks it staying stuck "waiting" on a REGISTER that never got a
  // final response, which would silently block every future register() call
  // on that same instance.
  function createRegisterer(): void {
    registerer = new Registerer(ua.value!)
    registerer.stateChange.addListener((s: RegistererState) => {
      if (s === RegistererState.Registered) {
        clearRegisterTimeout()
        status.value = 'registered'
      }
      // We never call registerer.unregister() ourselves (stop() tears down
      // the whole transport instead), so reaching Unregistered/Terminated
      // here only ever means the server rejected/dropped the registration.
      if (s === RegistererState.Unregistered || s === RegistererState.Terminated) {
        failRegistration()
      }
    })
  }

  function failRegistration(): void {
    clearRegisterTimeout()
    status.value = 'error'
    showNotice('errors.sipConnection')
    scheduleReRegister()
  }

  function registerOrFail(): void {
    status.value = 'registering'
    clearRegisterTimeout()
    // Guards against a REGISTER that never gets a final response (accepted
    // or rejected) — without this, a stuck request leaves the FAB spinning
    // forever with no way out.
    registerTimeout = setTimeout(() => {
      registerTimeout = null
      failRegistration()
    }, REGISTER_TIMEOUT_MS)

    registerer!.register({
      requestDelegate: {
        // The registration promise itself resolves even when the server
        // rejects it (e.g. wrong password) — the rejection only shows up
        // here, via the REGISTER response.
        onReject: () => failRegistration(),
      },
    }).catch(() => failRegistration())
  }

  // Retries registration (with a brand new Registerer) every few seconds,
  // indefinitely, until it succeeds or the widget is stopped.
  function scheduleReRegister(): void {
    if (reRegisterTimer) return
    reRegisterTimer = setTimeout(() => {
      reRegisterTimer = null
      // Bail out if something else already took over in the meantime (the
      // transport dropped again, or we were stopped).
      if (!ua.value || status.value !== 'error') return
      createRegisterer()
      registerOrFail()
    }, RETRY_INTERVAL_MS)
  }

  // sip.js's own reconnectionAttempts gives up after a fixed number of
  // tries — not good enough for something like "the Asterisk container was
  // restarted and took a minute to come back". So it's disabled (see
  // reconnectionAttempts: 0 below) and we retry ourselves, indefinitely,
  // until the transport is back — this loop is the only thing that stops
  // it (via stopReconnecting(), called from onConnect and stop()).
  function scheduleReconnect(immediate = false): void {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!ua.value) return // stop() ran while we were waiting
      ua.value.reconnect().catch(() => {
        if (status.value === 'reconnecting') scheduleReconnect()
      })
    }, immediate ? 0 : RETRY_INTERVAL_MS)
  }

  const ringbackTone   = useRingbackTone()
  const ringtone       = useRingtone()
  const busyTone       = useBusyTone()
  const hangupTone     = useHangupTone()
  const reconnectTone  = useReconnectTone()

  const remoteAudio = document.createElement('audio')
  remoteAudio.autoplay = true
  document.body.appendChild(remoteAudio)

  function _attachAudio(s: Session): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (s.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection | undefined
    if (!pc) return

    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams[0]) {
        remoteAudio.srcObject = event.streams[0]
        remoteAudio.play().catch((e: unknown) => console.warn('[SIP] Audio playback blocked:', e))
      }
    }

    const existing = pc.getReceivers().filter(r => r.track).map(r => r.track)
    if (existing.length) {
      remoteAudio.srcObject = new MediaStream(existing)
      remoteAudio.play().catch((e: unknown) => console.warn('[SIP] Audio playback blocked:', e))
    }
  }

  async function init(credentials: SIPCredentials): Promise<void> {
    const { extension, password, server, ws_url, display_name } = credentials

    loadHistory(extension)

    ua.value = new UserAgent({
      uri:              UserAgent.makeURI(`sip:${extension}@${server}`)!,
      displayName:      display_name ?? extension,
      transportOptions: { server: ws_url },
      authorizationUsername: extension,
      authorizationPassword: password,
      sessionDescriptionHandlerFactoryOptions: {
        constraints: { audio: true, video: false },
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      },
      // sip.js's built-in retry is disabled — we drive reconnection
      // ourselves (see scheduleReconnect above) so it keeps trying no
      // matter how long the SIP server is down for.
      reconnectionAttempts: 0,
    })

    ua.value.delegate = {
      onConnect() {
        reconnectTone.stop()
        stopReconnecting()
        // The transport came back after an unexpected drop — the previous
        // registration is stale, so register again with a fresh Registerer.
        if (status.value === 'reconnecting') {
          createRegisterer()
          registerOrFail()
        }
      },
      onDisconnect(error?: Error) {
        // Only an unexpected transport drop (error set) warrants the alert —
        // a clean disconnect (our own stop()) reports no error.
        if (error) {
          status.value = 'reconnecting'
          reconnectTone.start()
          scheduleReconnect(true)
        }
      },
      onInvite(invitation: Invitation) {
        const startedAt      = Date.now()
        const remoteExtension = invitation.remoteIdentity?.uri?.user || ''
        const remoteName      = invitation.remoteIdentity?.displayName || null

        session.value = invitation
        status.value  = 'ringing'
        caller.value  = remoteName || remoteExtension
        ringtone.start()

        invitation.stateChange.addListener((state: SessionState) => {
          if (state === SessionState.Established) {
            ringtone.stop()
            _attachAudio(invitation)
            status.value        = 'incall'
            callStartedAt.value = Date.now()
          }
          if (state === SessionState.Terminated) {
            ringtone.stop()
            if (status.value === 'incall') hangupTone.start()
            pushHistoryEntry({
              id:         crypto.randomUUID(),
              direction:  callStartedAt.value ? 'incoming' : 'missed',
              extension:  remoteExtension || caller.value,
              callerName: remoteName,
              timestamp:  startedAt,
              duration:   callStartedAt.value ? Math.round((Date.now() - callStartedAt.value) / 1000) : null,
            })
            status.value        = 'registered'
            session.value       = null
            caller.value        = ''
            callStartedAt.value = null
            muted.value         = false
            speakerMuted.value  = false
            remoteAudio.muted   = false
          }
        })
      },
    }

    await ua.value.start()

    createRegisterer()
    registerOrFail()
  }

  async function call(target: string, server: string): Promise<void> {
    if (!ua.value) return
    busyTone.stop()

    const startedAt = Date.now()

    const inviter = new Inviter(
      ua.value,
      UserAgent.makeURI(`sip:${target}@${server}`)!,
    )

    inviter.stateChange.addListener((state: SessionState) => {
      if (state === SessionState.Established) {
        ringbackTone.stop()
        _attachAudio(inviter)
        status.value        = 'incall'
        callStartedAt.value = Date.now()
      }
      if (state === SessionState.Terminated) {
        ringbackTone.stop()
        if (status.value === 'incall') hangupTone.start()
        pushHistoryEntry({
          id:         crypto.randomUUID(),
          direction:  'outgoing',
          extension:  target,
          callerName: null,
          timestamp:  startedAt,
          duration:   callStartedAt.value ? Math.round((Date.now() - callStartedAt.value) / 1000) : null,
        })
        status.value         = 'registered'
        session.value        = null
        callStartedAt.value  = null
        muted.value          = false
        speakerMuted.value   = false
        remoteAudio.muted    = false
      }
    })

    session.value = inviter
    status.value  = 'calling'
    // Asterisk can't synthesize the tone server-side for a WebRTC channel
    // (PCM → Opus transcoding unavailable without a paid codec), so the
    // tone is generated locally while the call is ringing.
    ringbackTone.start()
    await inviter.invite({
      requestDelegate: {
        onReject: (response) => {
          const code = response.message.statusCode
          ringbackTone.stop()
          if (code === 486 || code === 600) {
            busyTone.start()
            setTimeout(() => busyTone.stop(), 4000)
            showNotice('notice.busy')
          } else if (code === 603) {
            showNotice('notice.declined')
          } else if (code === 404) {
            showNotice('notice.notFound')
          } else if (code === 480) {
            showNotice('notice.unavailable')
          } else if (code !== undefined) {
            showNotice('notice.failed')
          }
        },
      },
    })
  }

  async function answer(): Promise<void> {
    if (session.value?.state !== SessionState.Initial) return
    answering.value = true
    try {
      await (session.value as Invitation).accept()
    } finally {
      answering.value = false
    }
  }

  async function hangup(): Promise<void> {
    if (!session.value) return
    const s = session.value.state
    if (s === SessionState.Initial || s === SessionState.Establishing) {
      if (session.value instanceof Invitation) {
        await session.value.reject()
      } else {
        await (session.value as Inviter).cancel()
      }
    } else {
      await session.value.bye()
    }
  }

  function stop(): void {
    ringbackTone.stop()
    ringtone.stop()
    busyTone.stop()
    hangupTone.stop()
    reconnectTone.stop()
    stopReconnecting()
    if (noticeTimer) {
      clearTimeout(noticeTimer)
      noticeTimer = null
    }
    callNotice.value = null
    ua.value?.stop()
    ua.value      = null
    registerer    = null
    session.value = null
    status.value  = 'disconnected'
  }

  function toggleMute(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (session.value?.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection | undefined
    if (!pc) return

    muted.value = !muted.value
    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') sender.track.enabled = !muted.value
    })
  }

  function toggleSpeaker(): void {
    speakerMuted.value = !speakerMuted.value
    remoteAudio.muted  = speakerMuted.value
  }

  onUnmounted(() => {
    ringbackTone.stop()
    ringtone.stop()
    busyTone.stop()
    hangupTone.stop()
    reconnectTone.stop()
    stopReconnecting()
    if (noticeTimer) clearTimeout(noticeTimer)
    ua.value?.stop()
    if (remoteAudio.parentNode) document.body.removeChild(remoteAudio)
  })

  return {
    status, caller, muted, speakerMuted, callStartedAt, answering, callNotice, history,
    init, call, answer, hangup, stop, toggleMute, toggleSpeaker,
    deleteHistoryEntry, clearHistory,
  }
}
