<template>
  <div class="mt-3 text-center">

    <span class="badge mb-2" :class="badgeClass">
      {{ label }}
    </span>

    <div v-if="status === 'calling'" class="p-3 border rounded">
      <p>Appel vers <strong>{{ target }}</strong></p>
      <button class="btn btn-danger" @click="$emit('hangup')">
        Annuler
      </button>
    </div>

    <div v-if="status === 'ringing'" class="p-3 border border-warning rounded">
      <p>Appel entrant</p>
      <div class="d-flex gap-2 justify-content-center">
        <button class="btn btn-success" @click="$emit('answer')">
          Décrocher
        </button>
        <button class="btn btn-danger" @click="$emit('hangup')">
          Refuser
        </button>
      </div>
    </div>

    <div v-if="status === 'incall'" class="p-3 border border-success rounded">
      <p>En communication</p>
      <button class="btn btn-danger" @click="$emit('hangup')">
        Raccrocher
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  target: string
}>()

defineEmits(['answer', 'hangup'])

const label = computed(() => ({
  disconnected: 'Déconnecté',
  registering: 'Connexion...',
  registered: 'Disponible',
  calling: 'Appel',
  ringing: 'Entrant',
  incall: 'En appel'
}[props.status] || props.status))

const badgeClass = computed(() => ({
  disconnected: 'bg-secondary',
  registering: 'bg-warning text-dark',
  registered: 'bg-success',
  calling: 'bg-primary',
  ringing: 'bg-warning text-dark',
  incall: 'bg-success'
}[props.status] || 'bg-secondary'))
</script>