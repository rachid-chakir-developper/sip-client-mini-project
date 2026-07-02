<template>
  <div class="call-screen">

    <div class="call-screen-header">
      <div class="call-screen-identity">
        <div class="call-screen-name">{{ target || t('call.unknownNumber') }}</div>
        <div class="call-screen-subtitle">{{ subtitle }}</div>
      </div>
      <div class="call-screen-avatar">
        <IconPerson />
      </div>
    </div>

    <div v-if="status === 'incall'" class="call-screen-secondary">
      <button
        type="button"
        class="secondary-btn"
        :class="{ 'secondary-btn-active': muted }"
        :title="muted ? t('call.unmuteMic') : t('call.muteMic')"
        @click="$emit('toggle-mute')"
      >
        <IconMicOff v-if="muted" />
        <IconMic v-else />
      </button>
      <button
        type="button"
        class="secondary-btn"
        :class="{ 'secondary-btn-active': speakerMuted }"
        :title="speakerMuted ? t('call.unmuteSpeaker') : t('call.muteSpeaker')"
        @click="$emit('toggle-speaker')"
      >
        <IconVolumeOff v-if="speakerMuted" />
        <IconVolume v-else />
      </button>
    </div>

    <div class="call-screen-actions">
      <button class="call-screen-btn call-screen-btn-hangup" :title="t('call.hangup')" @click="$emit('hangup')">
        <IconHangup />
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import IconPerson    from '../icons/IconPerson.vue'
import IconHangup    from '../icons/IconHangup.vue'
import IconMic       from '../icons/IconMic.vue'
import IconMicOff    from '../icons/IconMicOff.vue'
import IconVolume    from '../icons/IconVolume.vue'
import IconVolumeOff from '../icons/IconVolumeOff.vue'
import { usePhoneI18n } from '../hooks/usePhoneI18n'

const props = defineProps<{
  status:        string
  target:        string
  muted:         boolean
  speakerMuted:  boolean
  callStartedAt: number | null
}>()

defineEmits(['hangup', 'toggle-mute', 'toggle-speaker'])

const { t } = usePhoneI18n()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  if (timer) return
  timer = setInterval(() => { now.value = Date.now() }, 1000)
}
function stopTimer() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

watch(() => props.callStartedAt, val => {
  if (val) startTimer()
  else     stopTimer()
}, { immediate: true })

onMounted(() => { if (props.callStartedAt) startTimer() })
onUnmounted(stopTimer)

const elapsed = computed(() => {
  if (!props.callStartedAt) return '00:00'
  const seconds = Math.max(0, Math.floor((now.value - props.callStartedAt) / 1000))
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const subtitle = computed(() => {
  if (props.status === 'incall') return elapsed.value
  return t('call.inProgress')
})
</script>

<style scoped>
.call-screen {
  padding: 4px 4px 8px;
}

.call-screen-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.call-screen-identity {
  min-width: 0;
}

.call-screen-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.call-screen-subtitle {
  font-size: 0.75rem;
  color: #adb5bd;
  font-variant-numeric: tabular-nums;
}

.call-screen-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e9eff3;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-screen-secondary {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 18px;
}

.secondary-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f1f3f5;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.secondary-btn-active {
  background: #dc3545;
  color: #fff;
}

.call-screen-actions {
  display: flex;
  justify-content: center;
}

.call-screen-btn {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.call-screen-btn:hover {
  transform: scale(1.06);
}

.call-screen-btn-hangup {
  background: #dc3545;
}
</style>
