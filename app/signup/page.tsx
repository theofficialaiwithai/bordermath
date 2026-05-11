'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PASSPORT_OPTIONS = [
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
]

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passport, setPassport] = useState('US')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session && data.user) {
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        passport_country: passport,
      })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } else {
      setMessage('Check your email to confirm your account, then log in.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-semibold mb-1">Create account</h1>
        <p className="text-[#94A3B8] text-sm mb-8">Start planning your route.</p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-sm">
            {message}
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
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-[#1A1D27] border border-[#2A2D3E] rounded-md px-3 py-2.5 text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">Passport country</label>
            <select
              value={passport}
              onChange={e => setPassport(e.target.value)}
              className="w-full bg-[#1A1D27] border border-[#2A2D3E] rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
            >
              {PASSPORT_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#94A3B8]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#6366F1] hover:text-white transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
