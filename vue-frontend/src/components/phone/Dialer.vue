<template>
  <div>
    <div class="input-group mb-3">
      <input
        v-model="model"
        type="text"
        class="form-control"
        placeholder="Numéro à appeler…"
        @keyup.enter="emitCall"
      />
      <button class="btn btn-success" :disabled="!model" @click="emitCall">
        Appeler
      </button>
    </div>

    <div class="row g-2">
      <div v-for="n in keys" :key="n" class="col-4">
        <button class="btn btn-outline-secondary w-100" @click="append(n)">
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit  = defineEmits(['update:modelValue', 'call'])

const model = computed({
  get: () => props.modelValue,
  set: v  => emit('update:modelValue', v),
})

const keys = ['1','2','3','4','5','6','7','8','9','*','0','#']

function append(n: string) { model.value += n }
function emitCall()        { emit('call', model.value) }
</script>
