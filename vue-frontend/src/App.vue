<script setup lang="ts">
import { onMounted } from 'vue'
import Login from './components/auth/Login.vue'
import SoftphoneWidgetContainer from './components/phone/SoftphoneWidgetContainer.vue'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'

const { user, isAuthenticated, loading, fetchMe, logout } = useAuth()
const { t } = useI18n()

onMounted(fetchMe)
</script>

<template>
  <div v-if="loading" />
  <Login v-else-if="!isAuthenticated" @success="fetchMe" />
  <div v-else class="home">
    <header class="home-header">
      <span class="home-user">{{ user?.first_name }} {{ user?.last_name }}</span>
      <button class="home-logout" @click="logout">{{ t('disconnect') }}</button>
    </header>
    <SoftphoneWidgetContainer />
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #f8f9fa;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
}

.home-user {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.home-logout {
  border: 1px solid #dc3545;
  background: transparent;
  color: #dc3545;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.home-logout:hover {
  background: #dc3545;
  color: #fff;
}
</style>
