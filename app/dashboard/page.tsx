'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      } else {
        setUserId(data.session.user.id)
        setChecking(false)
      }
    })
  }, [router])

  async function handleNewTrip() {
    if (!userId || creating) return
    setCreating(true)

    const { data, error } = await supabase
      .from('trips')
      .insert({ user_id: userId, name: 'New trip', status: 'draft' })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create trip:', error?.message)
      setCreating(false)
      return
    }

    router.push(`/trips/${data.id}`)
  }

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <span className="text-[#94A3B8] text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl font-semibold">Your trips</h1>
        <button
          onClick={handleNewTrip}
          disabled={creating}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          {creating ? 'Creating…' : 'New trip'}
        </button>
      </div>
      <div className="border border-[#2A2D3E] rounded-lg p-12 text-center">
        <p className="text-[#94A3B8] text-sm">No trips yet. Create one to get started.</p>
      </div>
    </main>
  )
}
