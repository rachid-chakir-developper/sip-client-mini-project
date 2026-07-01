<template>
  <transition name="pop-fade">
    <div class="incoming-call-popup shadow-lg">
      <div class="avatar-circle">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4-4,1.79-4,4S9.79,12,12,12z M12,14c-2.67,0-8,1.34-8,4v2h16v-2C20,15.34,14.67,14,12,14z" />
        </svg>
      </div>

      <div class="flex-grow-1 text-truncate">
        <div class="fw-semibold small text-truncate">{{ caller || 'Numéro inconnu' }}</div>
        <div class="text-muted call-subtitle">Appel entrant…</div>
      </div>

      <button class="call-btn call-btn-success" title="Décrocher" @click="$emit('answer')">
        <IconCall />
      </button>
      <button class="call-btn call-btn-danger" title="Refuser" @click="$emit('hangup')">
        <IconHangup />
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import IconCall   from './IconCall.vue'
import IconHangup from './IconHangup.vue'

defineProps<{ caller: string }>()
defineEmits(['answer', 'hangup'])
</script>

<style scoped>
.incoming-call-popup {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 16px;
  padding: 10px 12px;
}

.call-subtitle {
  font-size: 0.7rem;
}

.avatar-circle {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e9eff3;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.call-btn-success {
  background: #28a745;
}

.call-btn-danger {
  background: #dc3545;
}

.pop-fade-enter-active,
.pop-fade-leave-active {
  transition: all 0.2s ease;
}
.pop-fade-enter-from,
.pop-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
