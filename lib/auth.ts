import { useUserStore, type User } from './store/userStore'

export { type User }

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  // We can't use hooks here, but useUserStore.getState() works for non-hook contexts
  useUserStore.getState().setUser(user)
  useUserStore.getState().setToken(token)
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  useUserStore.getState().clearAuth()
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getDashboardPath(role: string): string {
  const paths: Record<string, string> = {
    admin: '/admin/dashboard',
    teacher: '/teacher/dashboard',
    parent: '/parent/dashboard',
    student: '/student/dashboard',
  }
  return paths[role] || '/login'
}
