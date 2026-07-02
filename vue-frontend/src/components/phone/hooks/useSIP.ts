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

export function useSIP() {
  const ua            = ref<UserAgent | null>(null)
  const session       = ref<Session | null>(null)
  const status        = ref('disconnected')
  const caller        = ref('')
  const muted         = ref(false)
  const speakerMuted  = ref(false)
  const callStartedAt = ref<number | null>(null)
  const answering     = ref(false)

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
        remoteAudio.play().catch((e: unknown) => console.warn('[SIP] Audio bloqué:', e))
      }
    }

    const existing = pc.getReceivers().filter(r => r.track).map(r => r.track)
    if (existing.length) {
      remoteAudio.srcObject = new MediaStream(existing)
      remoteAudio.play().catch((e: unknown) => console.warn('[SIP] Audio bloqué:', e))
    }
  }

  async function init(credentials: SIPCredentials): Promise<void> {
    const { extension, password, server, ws_url, display_name } = credentials

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
      // Retry a few times on unexpected transport drops (see onDisconnect
      // below, which plays the reconnect alert tone while this is ongoing).
      reconnectionAttempts: 3,
      reconnectionDelay:    4,
    })

    ua.value.delegate = {
      onConnect() {
        reconnectTone.stop()
      },
      onDisconnect(error?: Error) {
        // Only an unexpected transport drop (error set) warrants the alert —
        // a clean disconnect (our own stop()) reports no error.
        if (error) reconnectTone.start()
      },
      onInvite(invitation: Invitation) {
        session.value = invitation
        status.value  = 'ringing'
        caller.value  = invitation.remoteIdentity?.displayName
          || invitation.remoteIdentity?.uri?.user
          || ''
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

    const registerer = new Registerer(ua.value)
    registerer.stateChange.addListener((s: RegistererState) => {
      if (s === RegistererState.Registered)   status.value = 'registered'
      if (s === RegistererState.Unregistered) status.value = 'disconnected'
    })

    status.value = 'registering'
    await registerer.register()
  }

  async function call(target: string, server: string): Promise<void> {
    if (!ua.value) return
    busyTone.stop()

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
          if (code === 486 || code === 600) {
            ringbackTone.stop()
            busyTone.start()
            setTimeout(() => busyTone.stop(), 4000)
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
    ua.value?.stop()
    ua.value      = null
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
    ua.value?.stop()
    if (remoteAudio.parentNode) document.body.removeChild(remoteAudio)
  })

  return {
    status, caller, muted, speakerMuted, callStartedAt, answering,
    init, call, answer, hangup, stop, toggleMute, toggleSpeaker,
  }
}
