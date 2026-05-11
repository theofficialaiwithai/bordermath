'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      } else {
        setChecking(false)
      }
    })
  }, [router])

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
        <button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
          New trip
        </button>
      </div>
      <div className="border border-[#2A2D3E] rounded-lg p-12 text-center">
        <p className="text-[#94A3B8] text-sm">No trips yet. Create one to get started.</p>
      </div>
    </main>
  )
}
