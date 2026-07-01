<template>
  <div class="incoming-screen">

    <div class="incoming-screen-header">
      <div class="incoming-screen-identity">
        <div class="fw-semibold text-truncate">{{ caller || t('call.unknownNumber') }}</div>
        <div class="incoming-screen-subtitle">{{ t('call.incoming') }}</div>
      </div>
      <div class="incoming-screen-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4-4,1.79-4,4S9.79,12,12,12z M12,14c-2.67,0-8,1.34-8,4v2h16v-2C20,15.34,14.67,14,12,14z" />
        </svg>
      </div>
    </div>

    <div class="incoming-screen-secondary">
      <span class="secondary-btn" :title="t('call.muteRingtone')">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12,22c1.1,0,2-0.9,2-2h-4C10,21.1,10.9,22,12,22z M18,16v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5S10.5,3.17,10.5,4v0.68C7.63,5.36,6,7.92,6,11v5l-2,2v1h16v-1L18,16z" />
        </svg>
      </span>
      <span class="secondary-btn" :title="t('call.replyMessage')">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M20,2H4C2.9,2,2,2.9,2,4v18l4-4h14c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z" />
        </svg>
      </span>
    </div>

    <div class="incoming-screen-actions">
      <button
        class="incoming-btn incoming-btn-answer"
        :title="t('call.answer')"
        :disabled="answering"
        @click="$emit('answer')"
      >
        <span v-if="answering" class="incoming-btn-spinner" />
        <IconCall v-else />
      </button>
      <button class="incoming-btn incoming-btn-decline" :title="t('call.decline')" :disabled="answering" @click="$emit('hangup')">
        <IconHangup />
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import IconCall   from './IconCall.vue'
import IconHangup from './IconHangup.vue'
import { usePhoneI18n } from './usePhoneI18n'

defineProps<{ caller: string; answering: boolean }>()
defineEmits(['answer', 'hangup'])

const { t } = usePhoneI18n()
</script>

<style scoped>
.incoming-screen {
  padding: 4px 4px 8px;
}

.incoming-screen-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.incoming-screen-identity {
  min-width: 0;
}

.incoming-screen-subtitle {
  font-size: 0.75rem;
  color: #adb5bd;
}

.incoming-screen-avatar {
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

.incoming-screen-secondary {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 22px;
}

.secondary-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f3f5;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.incoming-screen-actions {
  display: flex;
  justify-content: center;
  gap: 28px;
}

.incoming-btn {
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
.incoming-btn:hover {
  transform: scale(1.06);
}
.incoming-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

.incoming-btn-answer {
  background: #28a745;
}

.incoming-btn-decline {
  background: #dc3545;
}

.incoming-btn-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  animation: incoming-btn-spin 0.6s linear infinite;
}

@keyframes incoming-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
