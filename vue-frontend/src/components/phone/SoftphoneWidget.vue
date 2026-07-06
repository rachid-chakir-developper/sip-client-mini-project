<template>

  <!-- Self-contained floating widget: a single FAB + its popups. No page
       layout of its own — safe to drop anywhere in a host app, on every
       screen, regardless of routing. -->
  <div class="phone-widget">

    <!-- FAB: opens the call composer -->
    <button
      class="dialer-fab"
      :class="{
        'dialer-fab-active':       status === 'calling' || status === 'incall' || status === 'ringing',
        'dialer-fab-connecting':   status === 'registering' || status === 'disconnected',
        'dialer-fab-reconnecting': status === 'reconnecting',
        'dialer-fab-error':        status === 'error',
      }"
      :title="fabTitle"
      @click="dialerOpen = !dialerOpen"
    >
      <span v-if="status === 'registering' || status === 'reconnecting'" class="fab-spinner" />
      <IconWarning v-else-if="status === 'error'" />
      <IconCall v-else />
    </button>

    <!-- Self-dismissing banner: connection errors, busy / declined / call failed…, to the left of the FAB -->
    <CallNotice :message="noticeMessage" />

    <!-- Popup: keypad / incoming call / ongoing call -->
    <transition name="pop-fade">
      <div v-if="dialerOpen" class="dialer-popup">
        <div class="dialer-popup-header">
          <span class="dialer-popup-title">{{ dialerTitle }}</span>
          <button class="btn-close-popup" :aria-label="t('close')" @click="dialerOpen = false">&times;</button>
        </div>

        <div v-if="status === 'registering'" class="dialer-hint">
          {{ t('connectingServer') }}
        </div>

        <div v-if="status === 'reconnecting' || status === 'error'" class="dialer-hint">
          {{ t(`status.${status}`) }}
        </div>

        <template v-if="status === 'registered'">
          <DialerContacts
            v-if="dialerTab === 'contacts'"
            :contacts="contacts"
            @call="handleContactCall"
          />

          <Dialer
            v-if="dialerTab === 'keypad'"
            v-model="target"
            @call="makeCall"
          />

          <p v-if="dialerTab === 'recent'" class="dialer-empty">
            {{ t('recentEmpty') }}
          </p>

          <div class="dialer-tabs">
            <button
              type="button"
              class="dialer-tab"
              :class="{ 'dialer-tab-active': dialerTab === 'recent' }"
              @click="dialerTab = 'recent'"
            >
              <IconClock />
              <span>{{ t('tabs.recent') }}</span>
            </button>
            <button
              type="button"
              class="dialer-tab"
              :class="{ 'dialer-tab-active': dialerTab === 'keypad' }"
              @click="dialerTab = 'keypad'"
            >
              <IconKeypad />
              <span>{{ t('tabs.keypad') }}</span>
            </button>
            <button
              type="button"
              class="dialer-tab"
              :class="{ 'dialer-tab-active': dialerTab === 'contacts' }"
              @click="dialerTab = 'contacts'"
            >
              <IconPerson />
              <span>{{ t('tabs.contacts') }}</span>
            </button>
          </div>
        </template>

        <IncomingCallScreen
          v-if="status === 'ringing'"
          :caller="caller"
          :answering="answering"
          @answer="answer"
          @hangup="hangup"
        />

        <CallStatus
          v-if="status === 'calling' || status === 'incall'"
          :status="status"
          :target="target"
          :muted="muted"
          :speaker-muted="speakerMuted"
          :call-started-at="callStartedAt"
          @hangup="hangup"
          @toggle-mute="toggleMute"
          @toggle-speaker="toggleSpeaker"
        />
      </div>
    </transition>

    <!-- Popup: incoming call -->
    <IncomingCallPopup
      v-if="status === 'ringing'"
      :caller="caller"
      :answering="answering"
      @answer="answer"
      @hangup="hangup"
    />
  </div>

</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSIP } from './hooks/useSIP'
import { usePhoneI18n } from './hooks/usePhoneI18n'

import Dialer              from './components/Dialer.vue'
import CallStatus          from './components/CallStatus.vue'
import DialerContacts      from './components/DialerContacts.vue'
import IncomingCallPopup   from './components/IncomingCallPopup.vue'
import IncomingCallScreen  from './components/IncomingCallScreen.vue'
import CallNotice          from './components/CallNotice.vue'
import IconCall            from './icons/IconCall.vue'
import IconClock           from './icons/IconClock.vue'
import IconKeypad          from './icons/IconKeypad.vue'
import IconPerson          from './icons/IconPerson.vue'
import IconWarning         from './icons/IconWarning.vue'

// Public contract of this module — kept intentionally backend-agnostic so
// the whole `phone/` folder can be copied into another Vue app unchanged.
// See ./README.md for the integration guide and the backend contract a host
// app must implement to supply these props.
export interface PhoneUser {
  displayName: string
  extension:   string
  password:    string
}

export interface PhoneContact {
  displayName: string
  extension:   string
}

const props = defineProps<{
  /** WebSocket URI of the SIP server transport, e.g. "wss://sip.example.com:8089/ws". */
  sipServerUri: string
  /** SIP identity used to register this session — who "I" am. */
  currentUser:  PhoneUser
  /** Other reachable SIP endpoints, shown in the dialer's contacts tab. */
  contacts:     PhoneContact[]
  /** Optional UI locale override ('fr' | 'en' | 'es' | 'de'); auto-detected otherwise. */
  locale?: string
}>()

const {
  status, caller, muted, speakerMuted, callStartedAt, answering, callNotice,
  init, call, answer, hangup, toggleMute, toggleSpeaker,
} = useSIP()

const { t, setLocale } = usePhoneI18n()

watch(() => props.locale, val => {
  if (val) setLocale(val)
}, { immediate: true })

const sipDomain = computed(() => new URL(props.sipServerUri).hostname)
const callError = ref('')

const noticeMessage = computed(() => {
  if (callNotice.value) return t(callNotice.value)
  if (callError.value) return t(callError.value)
  return null
})

const fabTitle = computed(() => {
  if (status.value === 'registering' || status.value === 'reconnecting' || status.value === 'error') {
    return t(`status.${status.value}`)
  }
  return t('fabTitle')
})

const target     = ref('')
const dialerOpen = ref(false)
const dialerTab  = ref<'recent' | 'keypad' | 'contacts'>('contacts')

watch(status, val => {
  if (val === 'calling' || val === 'incall' || val === 'ringing') dialerOpen.value = true
})

const dialerTitle = computed(() => {
  if (status.value === 'registered') return t(`tabs.${dialerTab.value}`)
  if (status.value === 'ringing' || status.value === 'calling' || status.value === 'incall') {
    return t(`titles.${status.value}`)
  }
  return t('titles.call')
})

onMounted(async () => {
  try {
    await init({
      extension:    props.currentUser.extension,
      password:     props.currentUser.password,
      server:       sipDomain.value,
      ws_url:       props.sipServerUri,
      display_name: props.currentUser.displayName,
    })
  } catch (e) {
    callError.value = 'errors.sipConnection'
    console.error(e)
  }
})

async function makeCall(number: string) {
  if (!number) return
  callError.value = ''
  try {
    await call(number, sipDomain.value)
  } catch {
    callError.value = 'errors.callFailed'
  }
}

function handleContactCall(extension: string) {
  target.value = extension
  makeCall(extension)
}
</script>

<style scoped>
.dialer-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dialer-popup-title {
  font-weight: 600;
  font-size: 0.85rem;
}

.dialer-hint {
  text-align: center;
  font-size: 0.8rem;
  color: #868e96;
  padding: 14px 0;
}

.dialer-empty {
  text-align: center;
  font-size: 0.8rem;
  color: #868e96;
  padding: 18px 0;
  margin: 0;
}

.dialer-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #28a745;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  z-index: 1090;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.dialer-fab:hover {
  transform: scale(1.06);
}
.dialer-fab-active {
  background: #0d6efd;
  animation: pulse-ring 1.4s ease-out infinite;
}
.dialer-fab-connecting {
  background: #adb5bd;
}
.dialer-fab-reconnecting {
  background: #fd7e14;
  animation: pulse-ring-orange 1.4s ease-out infinite;
}
.dialer-fab-error {
  background: #dc3545;
}
@keyframes pulse-ring-orange {
  0% {
    box-shadow: 0 0 0 0 rgba(253, 126, 20, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(253, 126, 20, 0), 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

.fab-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fab-spin 0.8s linear infinite;
}
@keyframes fab-spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(13, 110, 253, 0), 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

.dialer-popup {
  position: fixed;
  right: 24px;
  bottom: 92px;
  width: 300px;
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  z-index: 1085;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
}

.btn-close-popup {
  border: none;
  background: transparent;
  font-size: 1.25rem;
  line-height: 1;
  color: #6c757d;
  cursor: pointer;
}

.dialer-tabs {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #f1f3f5;
  margin-top: 10px;
  padding-top: 8px;
}

.dialer-tab {
  flex: 1 1 0;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #adb5bd;
  font-size: 0.65rem;
  padding: 2px 0;
  cursor: pointer;
}

.dialer-tab-active {
  color: #28a745;
}

.pop-fade-enter-active,
.pop-fade-leave-active {
  transition: all 0.18s ease;
}
.pop-fade-enter-from,
.pop-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
