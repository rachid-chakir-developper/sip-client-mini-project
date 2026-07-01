<template>

  <!-- ── Sélection du compte ── -->
  <div v-if="!selectedUser" class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-8 col-md-5">
          <div class="card shadow-sm">
            <div class="card-header text-center">
              <h5 class="mb-0">SIP Phone</h5>
            </div>
            <div class="card-body">
              <p class="text-muted text-center small mb-3">Choisissez votre compte</p>
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
                {{ loadError }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Interface téléphone + contacts ── -->
  <div v-else class="min-vh-100 bg-light py-4">
    <div class="container">
      <div class="row g-3 align-items-start">

        <!-- Téléphone -->
        <div class="col-12 col-md-7">
          <div class="card shadow-sm">
            <UserHeader :user="selectedUser" @disconnect="switchUser" />
            <div class="card-body">
              <div v-if="status === 'registering'" class="text-muted small mb-3">
                Connexion au serveur SIP…
              </div>
              <Dialer
                v-if="status === 'registered'"
                v-model="target"
                @call="makeCall"
              />
              <CallStatus
                :status="status"
                :target="target"
                @answer="answer"
                @hangup="hangup"
              />
              <div v-if="callError" class="alert alert-danger mt-3 mb-0 py-2 small">
                {{ callError }}
              </div>
            </div>
          </div>
        </div>

        <!-- Contacts -->
        <div class="col-12 col-md-5">
          <Contacts :contacts="otherContacts" @call="handleContactCall" />
        </div>

      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSIP } from '@/composables/useSIP'
import api from '@/api/index'

import UserHeader from './UserHeader.vue'
import Dialer     from './Dialer.vue'
import CallStatus from './CallStatus.vue'
import Contacts   from './Contacts.vue'

interface User {
  username:   string
  first_name: string
  last_name:  string
  extension:  string
}

const { status, init, call, answer, hangup, stop } = useSIP()

const users        = ref<User[]>([])
const selectedUser = ref<User | null>(null)
const sipServer    = ref('')
const target       = ref('')
const loadError    = ref('')
const callError    = ref('')

const otherContacts = computed(() =>
  users.value.filter(u => u.extension !== selectedUser.value?.extension)
)

onMounted(async () => {
  try {
    const { data } = await api.get('/users/')
    users.value = data
  } catch {
    loadError.value = 'Impossible de charger les utilisateurs.'
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
    callError.value    = 'Erreur de connexion SIP.'
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
    callError.value = "Impossible de passer l'appel."
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
