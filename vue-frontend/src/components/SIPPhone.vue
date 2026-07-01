<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-8 col-md-6 col-lg-5">

          <div class="card shadow-sm">
            <div class="card-header text-center">
              <h5 class="mb-0">SIP Phone</h5>
            </div>

            <!-- Sélection du compte -->
            <div v-if="!selectedUser" class="card-body">
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

            <!-- Interface téléphone -->
            <div v-else class="card-body">

              <!-- En-tête utilisateur -->
              <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <div>
                  <strong>{{ selectedUser.first_name }} {{ selectedUser.last_name }}</strong>
                  <span class="badge bg-secondary ms-2">{{ selectedUser.extension }}</span>
                </div>
                <button class="btn btn-link btn-sm text-secondary p-0" @click="switchUser">
                  Changer
                </button>
              </div>

              <!-- Statut -->
              <div class="mb-3">
                <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
              </div>

              <!-- Connexion en cours -->
              <div v-if="status === 'registering'" class="text-center text-muted small py-2">
                Connexion au serveur SIP…
              </div>

              <!-- Composeur -->
              <div v-if="status === 'registered'" class="input-group">
                <input
                  v-model="target"
                  type="text"
                  class="form-control"
                  placeholder="Extension à appeler…"
                  @keyup.enter="makeCall"
                />
                <button
                  class="btn btn-success"
                  :disabled="!target.trim()"
                  @click="makeCall"
                >
                  Appeler
                </button>
              </div>

              <!-- Appel sortant -->
              <div v-if="status === 'calling'" class="text-center py-2">
                <p class="mb-3">Appel vers <strong>{{ target }}</strong>…</p>
                <button class="btn btn-danger" @click="hangup">Annuler</button>
              </div>

              <!-- Appel entrant -->
              <div v-if="status === 'ringing'" class="text-center border border-success rounded p-3">
                <p class="fw-semibold mb-3">Appel entrant</p>
                <div class="d-flex gap-2 justify-content-center">
                  <button class="btn btn-success" @click="answer">Décrocher</button>
                  <button class="btn btn-danger" @click="hangup">Refuser</button>
                </div>
              </div>

              <!-- En communication -->
              <div v-if="status === 'incall'" class="text-center border border-primary rounded p-3">
                <p class="fw-semibold mb-3">En communication</p>
                <button class="btn btn-danger" @click="hangup">Raccrocher</button>
              </div>

              <div v-if="callError" class="alert alert-danger mt-3 mb-0 py-2 small">
                {{ callError }}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSIP } from '@/composables/useSIP'
import api from '@/api/index'

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

const statusLabel = computed(() => ({
  disconnected: 'Déconnecté',
  registering:  'Connexion…',
  registered:   'Disponible',
  calling:      'Appel en cours',
  ringing:      'Appel entrant',
  incall:       'En communication',
}[status.value] ?? status.value))

const statusBadgeClass = computed(() => ({
  disconnected: 'bg-secondary',
  registering:  'bg-warning text-dark',
  registered:   'bg-success',
  calling:      'bg-primary',
  ringing:      'bg-warning text-dark',
  incall:       'bg-success',
}[status.value] ?? 'bg-secondary'))

onMounted(async () => {
  try {
    const { data } = await api.get('/users/')
    users.value = data
  } catch {
    loadError.value = 'Impossible de charger la liste des utilisateurs.'
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
    callError.value    = 'Connexion SIP échouée. Vérifiez votre serveur Asterisk.'
    selectedUser.value = null
    console.error(e)
  }
}

async function makeCall() {
  if (!target.value.trim()) return
  callError.value = ''
  try {
    await call(target.value.trim(), sipServer.value)
  } catch {
    callError.value = "Impossible de passer l'appel."
  }
}

function switchUser() {
  stop()
  selectedUser.value = null
  target.value       = ''
  callError.value    = ''
}
</script>
