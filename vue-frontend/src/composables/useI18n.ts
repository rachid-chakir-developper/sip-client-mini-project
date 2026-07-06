import { ref } from 'vue'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import es from '../locales/es.json'
import de from '../locales/de.json'

export type AppLocale = 'fr' | 'en' | 'es' | 'de'

const FALLBACK_LOCALE: AppLocale = 'en'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dictionaries: Record<AppLocale, any> = { en, fr, es, de }

function detectLocale(): AppLocale {
  const lang = (navigator.language || FALLBACK_LOCALE).slice(0, 2).toLowerCase()
  return lang in dictionaries ? (lang as AppLocale) : FALLBACK_LOCALE
}

// Shared across every non-phone screen (login, etc.), independent from the
// "phone" module's own i18n (see components/phone/hooks/usePhoneI18n.ts).
const locale = ref<AppLocale>(detectLocale())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(dict: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), dict)
}

export function useI18n() {
  function t(key: string): string {
    return resolve(dictionaries[locale.value], key)
      ?? resolve(dictionaries[FALLBACK_LOCALE], key)
      ?? key
  }

  function setLocale(next: string): void {
    if (next in dictionaries) locale.value = next as AppLocale
  }

  return { locale, setLocale, t }
}
