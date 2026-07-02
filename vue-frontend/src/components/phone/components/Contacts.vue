<template>
  <div class="card shadow-sm">
    <div class="card-header">
      {{ t('contacts.title') }}
    </div>

    <div class="list-group list-group-flush">
      <button
        v-for="c in contacts"
        :key="c.extension"
        class="list-group-item list-group-item-action d-flex justify-content-between"
        @click="$emit('call', c.extension)"
      >
        <span>{{ c.first_name }} {{ c.last_name }}</span>
        <span class="badge bg-primary">
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