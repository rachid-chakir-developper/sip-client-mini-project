<template>
  <div class="dialer-contacts">

    <div class="dialer-search">
      <svg class="dialer-search-icon" viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M15.5,14h-0.79l-0.28-0.27C15.41,12.59,16,11.11,16,9.5C16,5.91,13.09,3,9.5,3S3,5.91,3,9.5S5.91,16,9.5,16c1.61,0,3.09-0.59,4.23-1.57l0.27,0.28v0.79l5,4.99L20.49,19L15.5,14z M9.5,14C7.01,14,5,11.99,5,9.5S7.01,5,9.5,5S14,7.01,14,9.5S11.99,14,9.5,14z" />
      </svg>
      <input v-model="query" type="text" class="dialer-search-input" :placeholder="t('contacts.searchPlaceholder')" />
    </div>

    <div class="dialer-contacts-list">
      <p v-if="!filtered.length" class="dialer-contacts-empty">{{ t('contacts.empty') }}</p>

      <button
        v-for="c in filtered"
        :key="c.extension"
        type="button"
        class="dialer-contact-row"
        @click="$emit('call', c.extension)"
      >
        <span class="dialer-contact-avatar">
          <IconPerson />
        </span>
        <span class="dialer-contact-name text-truncate">{{ c.first_name }} {{ c.last_name }}</span>
        <span class="dialer-contact-call">
          <IconCall />
        </span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import IconPerson from './IconPerson.vue'
import IconCall    from './IconCall.vue'
import { usePhoneI18n } from './usePhoneI18n'

interface Contact {
  first_name: string
  last_name:  string
  extension:  string
}

const props = defineProps<{ contacts: Contact[] }>()
defineEmits(['call'])

const { t } = usePhoneI18n()

const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.contacts
  return props.contacts.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || c.extension.includes(q)
  )
})
</script>

<style scoped>
.dialer-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f3f5;
  border-radius: 10px;
  padding: 7px 10px;
  margin-bottom: 8px;
}

.dialer-search-icon {
  flex-shrink: 0;
  color: #adb5bd;
}

.dialer-search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.8rem;
  width: 100%;
  min-width: 0;
}
.dialer-search-input::placeholder {
  color: #adb5bd;
}

.dialer-contacts-list {
  max-height: 240px;
  overflow-y: auto;
}

.dialer-contacts-empty {
  text-align: center;
  color: #adb5bd;
  font-size: 0.8rem;
  padding: 16px 0;
  margin: 0;
}

.dialer-contact-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 7px 2px;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
}
.dialer-contact-row:hover {
  background: #f8f9fa;
}

.dialer-contact-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e9eff3;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialer-contact-name {
  flex-grow: 1;
  min-width: 0;
  font-size: 0.85rem;
}

.dialer-contact-call {
  flex-shrink: 0;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
