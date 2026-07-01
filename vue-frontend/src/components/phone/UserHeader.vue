<template>
  <div class="card-header d-flex justify-content-between align-items-center">
    <div>
      <strong>{{ user.first_name }} {{ user.last_name }}</strong>
      <span class="badge bg-secondary ms-2">{{ user.extension }}</span>
    </div>
    <button class="btn btn-sm btn-outline-danger" @click="$emit('disconnect')">
      Déconnecter
    </button>
  </div>
</template>

<script setup lang="ts">
interface User {
  first_name: string
  last_name:  string
  extension:  string
}
defineProps<{ user: User }>()
defineEmits(['disconnect'])
</script>
