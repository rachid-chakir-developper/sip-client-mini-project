<script setup lang="ts">
import { onMounted } from 'vue'
import Login from './components/auth/Login.vue'
import PhoneApp from './components/phone/PhoneApp.vue'
import { useAuth } from '@/composables/useAuth'

const { user, isAuthenticated, loading, fetchMe, logout } = useAuth()

onMounted(fetchMe)
</script>

<template>
  <div v-if="loading" />
  <Login v-else-if="!isAuthenticated" @success="fetchMe" />
  <PhoneApp v-else :current-user="user!" @logout="logout" />
</template>
