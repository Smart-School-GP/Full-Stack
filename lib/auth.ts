export interface User {
  id: string
  name: string
  email?: string
  role: 'admin' | 'teacher' | 'parent' | 'student'
  school_id: string
}

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
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
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
