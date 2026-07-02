<template>

  <!-- ── Account selection ── -->
  <div v-if="!selectedUser" class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-8 col-md-5">
          <div class="card shadow-sm">
            <div class="card-header text-center">
              <h5 class="mb-0">{{ t('title') }}</h5>
            </div>
            <div class="card-body">
              <p class="text-muted text-center small mb-3">{{ t('chooseAccount') }}</p>
              <div class="list-group">
                <button
                  v-for="u in users"
                  :key="u.extension"
                  type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  @click="selectUser(u)"
                >
                  <span class="fw-semibold">{{ u.first_name }} {{ u.last_name }}</span>
                  <span class="badge bg-primary rounded-pill">{{ u.extension }}</span>
                </button>
              </div>
              <div v-if="loadError" class="alert alert-danger mt-3 mb-0 py-2 small">
                {{ t(loadError) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Phone interface + contacts ── -->
  <div v-else class="min-vh-100 bg-light py-4">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">

          <!-- Connected account -->
          <div class="card shadow-sm">
            <UserHeader :user="selectedUser" @disconnect="switchUser" />
            <div class="card-body">
              <div v-if="status === 'registering'" class="text-muted small text-center py-2">
                {{ t('connectingServer') }}
              </div>
              <p v-else class="text-muted small text-center mb-0 py-2">
                {{ t('hintUseFab') }}
              </p>
              <div v-if="callError" class="alert alert-danger mt-3 mb-0 py-2 small">
                {{ t(callError) }}
              </div>
            </div>
          </div>

          <!-- Contact list -->
          <div class="mt-3">
            <Contacts :contacts="otherContacts" @call="handleContactCall" />
          </div>

        </div>
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

    <!-- Popup: keypad / incoming call / ongoing call -->
    <transition name="pop-fade">
      <div v-if="dialerOpen" class="dialer-popup shadow-lg">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold small">{{ dialerTitle }}</span>
          <button class="btn-close-popup" :aria-label="t('close')" @click="dialerOpen = false">&times;</button>
        </div>

        <div v-if="status === 'registering'" class="text-muted small text-center py-3">
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

          <p v-if="dialerTab === 'recent'" class="text-muted small text-center py-4 mb-0">
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

        <div v-if="callError" class="alert alert-danger mt-3 mb-0 py-2 small">
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
  status, caller, muted, speakerMuted, callStartedAt, answering,
  init, call, answer, hangup, stop, toggleMute, toggleSpeaker,
} = useSIP()

const { t, setLocale } = usePhoneI18n()

watch(() => props.locale, val => {
  if (val) setLocale(val)
}, { immediate: true })

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
