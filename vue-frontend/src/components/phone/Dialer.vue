<template>
  <div class="dialer">

    <div class="dialer-display">
      <input
        v-model="model"
        type="text"
        class="dialer-input"
        placeholder="Composer un numéro"
        @keyup.enter="emitCall"
      />
      <button v-if="model" class="dialer-backspace" title="Effacer" @click="backspace">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M22,3H7C6.31,3,5.77,3.35,5.41,3.88L0,12l5.41,8.12C5.77,20.64,6.31,21,7,21h15c1.1,0,2-0.9,2-2V5C24,3.9,23.1,3,22,3z M19,15.59L17.59,17L14,13.41L10.41,17L9,15.59L12.59,12L9,8.41L10.41,7L14,10.59L17.59,7L19,8.41L15.41,12L19,15.59z" />
        </svg>
      </button>
    </div>

    <div class="dialer-keypad">
      <button
        v-for="k in keys"
        :key="k.digit"
        type="button"
        class="dialer-key"
        @click="append(k.digit)"
      >
        <span class="dialer-key-digit">{{ k.digit }}</span>
        <span class="dialer-key-letters">{{ k.letters }}</span>
      </button>
    </div>

    <button class="dialer-call-btn" :disabled="!model" @click="emitCall">
      <IconCall />
    </button>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconCall from './IconCall.vue'

const props = defineProps<{ modelValue: string }>()
const emit  = defineEmits(['update:modelValue', 'call'])

const model = computed({
  get: () => props.modelValue,
  set: v  => emit('update:modelValue', v),
})

const keys = [
  { digit: '1', letters: ''     },
  { digit: '2', letters: 'ABC'  },
  { digit: '3', letters: 'DEF'  },
  { digit: '4', letters: 'GHI'  },
  { digit: '5', letters: 'JKL'  },
  { digit: '6', letters: 'MNO'  },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV'  },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: ''     },
  { digit: '0', letters: '+'    },
  { digit: '#', letters: ''     },
]

function append(n: string) { model.value += n }
function backspace()       { model.value = model.value.slice(0, -1) }
function emitCall()        { emit('call', model.value) }
</script>

<style scoped>
.dialer {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialer-display {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;
  min-height: 32px;
}

.dialer-input {
  border: none;
  outline: none;
  background: transparent;
  text-align: center;
  font-size: 1.15rem;
  letter-spacing: 1px;
  color: var(--text-h, #061018);
  width: 100%;
  min-width: 0;
}
.dialer-input::placeholder {
  font-size: 0.85rem;
  color: #adb5bd;
  letter-spacing: normal;
}

.dialer-backspace {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
}

.dialer-keypad {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
}

.dialer-key {
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: none;
  background: #f1f3f5;
  color: var(--text-h, #061018);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  cursor: pointer;
  transition: background-color 0.12s ease, transform 0.08s ease;
}
.dialer-key:hover {
  background: #e9ecef;
}
.dialer-key:active {
  transform: scale(0.94);
  background: #dee2e6;
}

.dialer-key-digit {
  font-size: 1.05rem;
  font-weight: 600;
}

.dialer-key-letters {
  font-size: 0.55rem;
  letter-spacing: 0.5px;
  color: #868e96;
  min-height: 0.7rem;
}

.dialer-call-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #28a745;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.dialer-call-btn:hover:not(:disabled) {
  transform: scale(1.05);
}
.dialer-call-btn:disabled {
  background: #adb5bd;
  cursor: default;
}
</style>
