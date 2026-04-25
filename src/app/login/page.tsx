'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import { isAuthenticated, getDashboardPath } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { user: ctxUser, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated() && ctxUser) {
      router.push(getDashboardPath(ctxUser.role))
    }
  }, [router, ctxUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const { token, user } = res.data
      login(token, user)
      router.push(getDashboardPath(user.role))
    } catch (err: any) {
      console.error('Login error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const demoCredentials = [
    { role: 'Admin', email: 'sarah@greenwood.edu', password: 'admin123' },
    { role: 'Teacher', email: 'john.smith@greenwood.edu', password: 'teacher123' },
    { role: 'Parent', email: 'michael.davis@email.com', password: 'parent123' },
    { role: 'Student', email: 'jack.white@greenwood.edu', password: 'student123' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md">
        {/* Logo / Brand */} 
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">School Ecosystem</h1>
          <p className="text-blue-200 mt-1 text-sm">Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label" style={{ marginBottom: 0 }}>Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Forgot my password?
                </Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-3">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2">
            {demoCredentials.map((cred) => (
              <button
                key={cred.role}
                onClick={() => { setEmail(cred.email); setPassword(cred.password) }}
                className="text-left p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="block text-white text-xs font-semibold">{cred.role}</span>
                <span className="block text-blue-200 text-xs truncate">{cred.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
