import { reactive, toRefs } from 'vue'
import api, { SESSION_EXPIRED_EVENT } from '@/api/index'

export interface AuthUser {
  username:        string
  first_name:      string
  last_name:       string
  has_sip_account: boolean
}

interface AuthState {
  user:            AuthUser | null
  isAuthenticated: boolean
  loading:         boolean
  error:           string
}

const state = reactive<AuthState>({
  user:            null,
  isAuthenticated: false,
  loading:         true,
  error:           '',
})

window.addEventListener(SESSION_EXPIRED_EVENT, () => {
  state.user            = null
  state.isAuthenticated = false
})

async function fetchCsrf() {
  await api.get('/auth/csrf/')
}

async function fetchMe() {
  state.loading = true
  try {
    const { data } = await api.get('/auth/me/')
    state.user            = data
    state.isAuthenticated = true
  } catch {
    state.user            = null
    state.isAuthenticated = false
  } finally {
    state.loading = false
  }
}

async function login(username: string, password: string) {
  state.error = ''
  try {
    await fetchCsrf()
    const { data } = await api.post('/auth/login/', { username, password })
    state.user            = data
    state.isAuthenticated = true
    return true
  } catch (e: any) {
    state.error = e?.response?.data?.error || 'errors.loginFailed'
    return false
  }
}

async function logout() {
  try {
    await api.post('/auth/logout/')
  } finally {
    state.user            = null
    state.isAuthenticated = false
  }
}

export function useAuth() {
  return {
    ...toRefs(state),
    fetchCsrf,
    fetchMe,
    login,
    logout,
  }
}
