import { ref } from 'vue'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import es from '../locales/es.json'
import de from '../locales/de.json'

export type PhoneLocale = 'fr' | 'en' | 'es' | 'de'

const FALLBACK_LOCALE: PhoneLocale = 'en'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dictionaries: Record<PhoneLocale, any> = { en, fr, es, de }

function detectLocale(): PhoneLocale {
  const lang = (navigator.language || FALLBACK_LOCALE).slice(0, 2).toLowerCase()
  return lang in dictionaries ? (lang as PhoneLocale) : FALLBACK_LOCALE
}

// A single locale state shared across the whole "phone" module, so that all
// components stay in sync without depending on a global plugin (i18n, store…).
const locale = ref<PhoneLocale>(detectLocale())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(dict: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), dict)
}

export function usePhoneI18n() {
  function t(key: string): string {
    return resolve(dictionaries[locale.value], key)
      ?? resolve(dictionaries[FALLBACK_LOCALE], key)
      ?? key
  }

  function setLocale(next: string): void {
    if (next in dictionaries) locale.value = next as PhoneLocale
  }

  return { locale, setLocale, t }
}
