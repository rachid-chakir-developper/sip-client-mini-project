<template>
  <div class="card shadow-sm">
    <div class="card-header">
      Contacts
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
defineProps<{ contacts: any[] }>()
defineEmits(['call'])
</script>