<template>
  <SoftphoneWidget
    v-if="sipUser"
    :sip-server-uri="sipServerUri"
    :current-user="sipUser"
    :contacts="contacts"
  />
</template>

<script setup lang="ts">
// Adapts this app's own backend (Django) to SoftphoneWidget's generic,
// backend-agnostic prop contract — see README.md. This is the one file in
// this folder that is NOT backend-agnostic: it calls this app's own Django
// endpoints, so treat it as a reference example to adapt, not something to
// copy verbatim when reusing this folder in another project (see README).
import { onMounted, ref } from 'vue'
import SoftphoneWidget from './SoftphoneWidget.vue'
import type { PhoneUser, PhoneContact } from './SoftphoneWidget.vue'
import api from '@/api/index'

const sipServerUri = ref('')
const sipUser       = ref<PhoneUser | null>(null)
const contacts      = ref<PhoneContact[]>([])

async function loadPhoneData() {
  await Promise.all([
    api.get('/sip/me/').then(({ data }) => {
      sipUser.value = {
        displayName: data.display_name,
        extension:   data.extension,
        password:    data.password,
      }
      sipServerUri.value = data.ws_url
    }).catch(e => console.error('Unable to load SIP credentials', e)),

    api.get('/sip/contacts/').then(({ data }) => {
      contacts.value = data.map((c: { first_name: string, last_name: string, username: string, extension: string }) => ({
        displayName: `${c.first_name} ${c.last_name}`.trim() || c.username,
        extension:   c.extension,
      }))
    }).catch(e => console.error('Unable to load contacts', e)),
  ])
}

onMounted(loadPhoneData)
</script>
