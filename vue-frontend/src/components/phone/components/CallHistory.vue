<template>
  <div class="call-history">
    <div v-if="entries.length" class="call-history-header">
      <button type="button" class="call-history-clear" @click="$emit('clear')">
        {{ t('history.clear') }}
      </button>
    </div>

    <p v-if="!entries.length" class="call-history-empty">{{ t('recentEmpty') }}</p>

    <div v-for="e in entries" :key="e.id" class="call-history-row">
      <button
        type="button"
        class="call-history-main"
        :title="t(`history.${e.direction}`)"
        @click="$emit('call', e.extension)"
      >
        <span class="call-history-icon" :class="`call-history-icon-${e.direction}`">
          <IconCallMissed   v-if="e.direction === 'missed'" />
          <IconCallIncoming v-else-if="e.direction === 'incoming'" />
          <IconCallOutgoing v-else />
        </span>
        <span class="call-history-info">
          <span class="call-history-name">{{ displayName(e) }}</span>
          <span class="call-history-time">{{ formatTime(e.timestamp) }}</span>
        </span>
        <span v-if="e.duration !== null" class="call-history-duration">{{ formatDuration(e.duration) }}</span>
        <span class="call-history-call">
          <IconCall />
        </span>
      </button>

      <button
        type="button"
        class="call-history-delete"
        :aria-label="t('history.delete')"
        :title="t('history.delete')"
        @click="$emit('delete', e.id)"
      >&times;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePhoneI18n } from '../hooks/usePhoneI18n'
import type { CallHistoryEntry } from '../hooks/useSIP'
import IconCall          from '../icons/IconCall.vue'
import IconCallIncoming  from '../icons/IconCallIncoming.vue'
import IconCallOutgoing  from '../icons/IconCallOutgoing.vue'
import IconCallMissed    from '../icons/IconCallMissed.vue'

interface Contact {
  displayName: string
  extension:   string
}

const props = defineProps<{ entries: CallHistoryEntry[], contacts: Contact[] }>()
defineEmits<{ call: [extension: string], delete: [id: string], clear: [] }>()

const { t, locale } = usePhoneI18n()

function displayName(entry: CallHistoryEntry): string {
  const contact = props.contacts.find(c => c.extension === entry.extension)
  // Falls through to the raw number for callers outside the contacts list
  // (door intercoms, other physical SIP devices…), and finally to a generic
  // label if even that's missing.
  return contact?.displayName || entry.callerName || entry.extension || t('call.unknownNumber')
}

function formatTime(timestamp: number): string {
  const date  = new Date(timestamp)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()

  return sameDay
    ? new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit' }).format(date)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<style scoped>
.call-history {
  max-height: 240px;
  overflow-y: auto;
}

.call-history-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

.call-history-clear {
  border: none;
  background: transparent;
  color: #868e96;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 4px;
  cursor: pointer;
}
.call-history-clear:hover {
  color: #dc3545;
}

.call-history-empty {
  text-align: center;
  color: #adb5bd;
  font-size: 0.8rem;
  padding: 16px 0;
  margin: 0;
}

.call-history-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.call-history-main {
  flex-grow: 1;
  min-width: 0;
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
.call-history-row:hover .call-history-main {
  background: #f8f9fa;
}

.call-history-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e9eff3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.call-history-icon-incoming {
  color: #28a745;
}
.call-history-icon-outgoing {
  color: #0d6efd;
}
.call-history-icon-missed {
  color: #dc3545;
}

.call-history-info {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.call-history-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
}

.call-history-time {
  font-size: 0.7rem;
  color: #adb5bd;
}

.call-history-duration {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: #adb5bd;
  font-variant-numeric: tabular-nums;
}

.call-history-call {
  flex-shrink: 0;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-history-delete {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #ced4da;
  font-size: 1.1rem;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
}
.call-history-delete:hover {
  color: #dc3545;
  background: #f8f9fa;
}
</style>
