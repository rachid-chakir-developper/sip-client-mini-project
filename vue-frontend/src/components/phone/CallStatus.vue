<template>
  <div class="call-screen">

    <div class="call-screen-header">
      <div class="call-screen-identity">
        <div class="fw-semibold text-truncate">{{ target || 'Numéro inconnu' }}</div>
        <div class="call-screen-subtitle">{{ subtitle }}</div>
      </div>
      <div class="call-screen-avatar">
        <IconPerson />
      </div>
    </div>

    <div class="call-screen-actions">
      <button class="call-screen-btn call-screen-btn-hangup" title="Raccrocher" @click="$emit('hangup')">
        <IconHangup />
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconPerson  from './IconPerson.vue'
import IconHangup  from './IconHangup.vue'

const props = defineProps<{
  status: string
  target: string
}>()

defineEmits(['hangup'])

const subtitle = computed(() => ({
  calling: 'Appel en cours…',
  incall:  'En communication',
}[props.status] ?? props.status))
</script>

<style scoped>
.call-screen {
  padding: 4px 4px 8px;
}

.call-screen-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 22px;
}

.call-screen-identity {
  min-width: 0;
}

.call-screen-subtitle {
  font-size: 0.75rem;
  color: #adb5bd;
}

.call-screen-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e9eff3;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-screen-actions {
  display: flex;
  justify-content: center;
}

.call-screen-btn {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.call-screen-btn:hover {
  transform: scale(1.06);
}

.call-screen-btn-hangup {
  background: #dc3545;
}
</style>
