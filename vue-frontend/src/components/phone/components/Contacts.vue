<template>
  <div class="contacts-card">
    <div class="contacts-card-header">
      {{ t('contacts.title') }}
    </div>

    <div class="contacts-list">
      <button
        v-for="c in contacts"
        :key="c.extension"
        class="contacts-row"
        @click="$emit('call', c.extension)"
      >
        <span>{{ c.first_name }} {{ c.last_name }}</span>
        <span class="contacts-row-badge">
          {{ c.extension }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePhoneI18n } from '../hooks/usePhoneI18n'

defineProps<{ contacts: any[] }>()
defineEmits(['call'])

const { t } = usePhoneI18n()
</script>

<style scoped>
.contacts-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.contacts-card-header {
  padding: 12px 18px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
  border-bottom: 1px solid #f1f3f5;
}

.contacts-list {
  display: flex;
  flex-direction: column;
}

.contacts-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: none;
  border-bottom: 1px solid #f1f3f5;
  background: #fff;
  padding: 12px 18px;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  transition: background-color 0.12s ease;
}
.contacts-row:last-child {
  border-bottom: none;
}
.contacts-row:hover {
  background: #f8f9fa;
}

.contacts-row-badge {
  flex-shrink: 0;
  background: #28a745;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}
</style>
