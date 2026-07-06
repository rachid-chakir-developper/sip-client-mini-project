import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
})

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use(config => {
  const method = (config.method || 'get').toLowerCase()
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    const csrfToken = readCookie('csrftoken')
    if (csrfToken) {
      config.headers = config.headers ?? {}
      config.headers['X-CSRFToken'] = csrfToken
    }
  }
  return config
})

export const SESSION_EXPIRED_EVENT = 'session-expired'

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  }
)

export default api
