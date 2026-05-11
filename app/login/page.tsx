'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-[#94A3B8] text-sm mb-8">Log in to your account.</p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#1A1D27] border border-[#2A2D3E] rounded-md px-3 py-2.5 text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full bg-[#1A1D27] border border-[#2A2D3E] rounded-md px-3 py-2.5 text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#94A3B8]">
          No account?{' '}
          <Link href="/signup" className="text-[#6366F1] hover:text-white transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
