<template>
  <transition name="call-notice-fade">
    <div v-if="message" class="call-notice">
      {{ message }}
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{ message: string | null }>()
</script>

<style scoped>
.call-notice {
  /* Sits to the left of the dialer FAB (right: 24px, 56px wide). */
  position: fixed;
  right: 92px;
  bottom: 24px;
  height: 56px;
  display: flex;
  align-items: center;
  z-index: 1200;
  background: #212529;
  color: #fff;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
}

.call-notice-fade-enter-active,
.call-notice-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.call-notice-fade-enter-from,
.call-notice-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
