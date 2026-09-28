import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import type { AuthUser } from '@/types/auth'

const TOKEN_KEY = 'pemda_access_token'
const USER_KEY = 'pemda_user'

interface AuthState {
  auth: {
    user: AuthUser | null
    accessToken: string
    setUser: (user: AuthUser | null) => void
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  let initToken = ''
  let initUser: AuthUser | null = null

  try {
    const rawToken = getCookie(TOKEN_KEY)
    if (rawToken) {
      initToken = JSON.parse(rawToken)
    }

    const rawUser = getCookie(USER_KEY)
    if (rawUser) {
      initUser = JSON.parse(rawUser)
    }
  } catch {
    initToken = ''
    initUser = null
  }

  return {
    auth: {
      user: initUser,
      accessToken: initToken,
      setUser: (user) =>
        set((state) => {
          if (user) {
            setCookie(USER_KEY, JSON.stringify(user))
          } else {
            removeCookie(USER_KEY)
          }
          return { ...state, auth: { ...state.auth, user } }
        }),
      setAccessToken: (accessToken) =>
        set((state) => {
          if (accessToken) {
            setCookie(TOKEN_KEY, JSON.stringify(accessToken))
          } else {
            removeCookie(TOKEN_KEY)
          }
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(TOKEN_KEY)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(TOKEN_KEY)
          removeCookie(USER_KEY)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
