<template>
  <div class="user-header">
    <div class="user-header-info">
      <strong class="user-header-name">{{ user.first_name }} {{ user.last_name }}</strong>
      <span class="user-header-ext">{{ user.extension }}</span>
    </div>
    <button class="user-header-disconnect" @click="$emit('disconnect')">
      {{ t('disconnect') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePhoneI18n } from '../hooks/usePhoneI18n'

interface User {
  first_name: string
  last_name:  string
  extension:  string
}
defineProps<{ user: User }>()
defineEmits(['disconnect'])

const { t } = usePhoneI18n()
</script>

<style scoped>
.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
}

.user-header-name {
  font-size: 0.9rem;
}

.user-header-ext {
  margin-left: 8px;
  background: #f1f3f5;
  color: #495057;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.user-header-disconnect {
  flex-shrink: 0;
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
.user-header-disconnect:hover {
  background: #dc3545;
  color: #fff;
}
</style>
