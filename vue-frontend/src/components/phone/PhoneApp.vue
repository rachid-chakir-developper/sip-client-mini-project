<template>

  <!-- ── Account selection ── -->
  <div v-if="!selectedUser" class="account-screen">
    <div class="account-card">
      <div class="account-card-header">
        <h1 class="account-title">{{ t('title') }}</h1>
      </div>
      <div class="account-card-body">
        <p class="account-subtitle">{{ t('chooseAccount') }}</p>
        <div class="account-list">
          <button
            v-for="u in users"
            :key="u.extension"
            type="button"
            class="account-row"
            @click="selectUser(u)"
          >
            <span class="account-row-name">{{ u.first_name }} {{ u.last_name }}</span>
            <span class="account-row-badge">{{ u.extension }}</span>
          </button>
        </div>
        <div v-if="loadError" class="error-banner">
          {{ t(loadError) }}
        </div>
      </div>
    </div>
  </div>

  <!-- ── Phone interface + contacts ── -->
  <div v-else class="phone-screen">
    <div class="phone-container">

      <!-- Connected account -->
      <div class="account-card">
        <UserHeader :user="selectedUser" @disconnect="switchUser" />
        <div class="account-card-body">
          <div v-if="status === 'registering'" class="hint-text">
            {{ t('connectingServer') }}
          </div>
          <p v-else class="hint-text">
            {{ t('hintUseFab') }}
          </p>
          <div v-if="callError" class="error-banner">
            {{ t(callError) }}
          </div>
        </div>
      </div>

      <!-- Contact list -->
      <div class="contact-list-wrap">
        <Contacts :contacts="otherContacts" @call="handleContactCall" />
      </div>

    </div>

    <!-- FAB: opens the call composer -->
    <button
      class="dialer-fab"
      :class="{ 'dialer-fab-active': status === 'calling' || status === 'incall' || status === 'ringing' }"
      :title="t('fabTitle')"
      @click="dialerOpen = !dialerOpen"
    >
      <IconCall />
    </button>

    <!-- Self-dismissing banner: busy / declined / call failed…, to the left of the FAB -->
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

        <template v-if="status === 'registered'">
          <DialerContacts
            v-if="dialerTab === 'contacts'"
            :contacts="otherContacts"
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

        <div v-if="callError" class="error-banner">
          {{ t(callError) }}
        </div>
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
import api from '@/api/index'

import UserHeader          from './components/UserHeader.vue'
import Dialer              from './components/Dialer.vue'
import CallStatus          from './components/CallStatus.vue'
import Contacts            from './components/Contacts.vue'
import DialerContacts      from './components/DialerContacts.vue'
import IncomingCallPopup   from './components/IncomingCallPopup.vue'
import IncomingCallScreen  from './components/IncomingCallScreen.vue'
import CallNotice          from './components/CallNotice.vue'
import IconCall            from './icons/IconCall.vue'
import IconClock           from './icons/IconClock.vue'
import IconKeypad          from './icons/IconKeypad.vue'
import IconPerson          from './icons/IconPerson.vue'

interface User {
  username:   string
  first_name: string
  last_name:  string
  extension:  string
}

const props = defineProps<{ locale?: string }>()

const {
  status, caller, muted, speakerMuted, callStartedAt, answering, callNotice,
  init, call, answer, hangup, stop, toggleMute, toggleSpeaker,
} = useSIP()

const { t, setLocale } = usePhoneI18n()

watch(() => props.locale, val => {
  if (val) setLocale(val)
}, { immediate: true })

const noticeMessage = computed(() => callNotice.value ? t(callNotice.value) : null)

const users        = ref<User[]>([])
const selectedUser = ref<User | null>(null)
const sipServer    = ref('')
const target       = ref('')
const loadError    = ref('')
const callError    = ref('')
const dialerOpen   = ref(false)
const dialerTab    = ref<'recent' | 'keypad' | 'contacts'>('contacts')

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

const otherContacts = computed(() =>
  users.value.filter(u => u.extension !== selectedUser.value?.extension)
)

onMounted(async () => {
  try {
    const { data } = await api.get('/users/')
    users.value = data
  } catch {
    loadError.value = 'errors.loadUsers'
  }
})

async function selectUser(user: User) {
  callError.value    = ''
  selectedUser.value = user
  try {
    const { data } = await api.get('/sip/credentials/', {
      params: { extension: user.extension },
    })
    sipServer.value = data.server
    await init(data)
  } catch (e) {
    callError.value    = 'errors.sipConnection'
    selectedUser.value = null
    console.error(e)
  }
}

async function makeCall(number: string) {
  if (!number) return
  callError.value = ''
  try {
    await call(number, sipServer.value)
  } catch {
    callError.value = 'errors.callFailed'
  }
}

function handleContactCall(extension: string) {
  target.value = extension
  makeCall(extension)
}

function switchUser() {
  stop()
  selectedUser.value = null
  target.value       = ''
  callError.value    = ''
}
</script>

<style scoped>
.account-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 24px 16px;
}

.account-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.account-card-header {
  padding: 18px 20px;
  text-align: center;
  border-bottom: 1px solid #f1f3f5;
}

.account-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.account-card-body {
  padding: 18px 20px;
}

.account-subtitle {
  margin: 0 0 14px;
  text-align: center;
  font-size: 0.8rem;
  color: #868e96;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #f1f3f5;
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}
.account-row:hover {
  background: #f8f9fa;
}

.account-row-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.account-row-badge {
  flex-shrink: 0;
  background: #28a745;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}

.error-banner {
  margin-top: 12px;
  background: #fdecea;
  color: #b42318;
  font-size: 0.78rem;
  padding: 8px 12px;
  border-radius: 8px;
}

.phone-screen {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 24px 16px;
}

.phone-container {
  max-width: 480px;
  margin: 0 auto;
}

.contact-list-wrap {
  margin-top: 14px;
}

.hint-text {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: #868e96;
  padding: 8px 0;
}

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
