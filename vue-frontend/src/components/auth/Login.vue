<template>
  <div class="account-screen">
    <div class="account-card">
      <div class="account-card-header">
        <h1 class="account-title">{{ t('appTitle') }}</h1>
      </div>
      <form class="account-card-body" @submit.prevent="submit">
        <p class="account-subtitle">{{ t('login.title') }}</p>

        <label class="field-label" for="login-username">{{ t('login.username') }}</label>
        <input
          id="login-username"
          v-model="username"
          class="field-input"
          type="text"
          autocomplete="username"
          required
        />

        <label class="field-label" for="login-password">{{ t('login.password') }}</label>
        <input
          id="login-password"
          v-model="password"
          class="field-input"
          type="password"
          autocomplete="current-password"
          required
        />

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? t('login.submitting') : t('login.submit') }}
        </button>

        <div v-if="error" class="error-banner">{{ t(error) }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuth } from '@/composables/useAuth'

const { t } = useI18n()
const { login, error } = useAuth()

const username   = ref('')
const password   = ref('')
const submitting = ref(false)

const emit = defineEmits<{ success: [] }>()

async function submit() {
  submitting.value = true
  try {
    const ok = await login(username.value, password.value)
    if (ok) emit('success')
  } finally {
    submitting.value = false
  }
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
  display: flex;
  flex-direction: column;
}

.account-subtitle {
  margin: 0 0 14px;
  text-align: center;
  font-size: 0.8rem;
  color: #868e96;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
}

.field-input {
  border: 1px solid #dee2e6;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.9rem;
  margin-bottom: 14px;
}
.field-input:focus {
  outline: none;
  border-color: #28a745;
}

.submit-btn {
  border: none;
  background: #28a745;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.submit-btn:hover:not(:disabled) {
  background: #218838;
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.error-banner {
  margin-top: 12px;
  background: #fdecea;
  color: #b42318;
  font-size: 0.78rem;
  padding: 8px 12px;
  border-radius: 8px;
}
</style>
