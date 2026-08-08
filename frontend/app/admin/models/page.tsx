'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { ModelTable } from '@/components/admin/ModelTable'
import { useAuth } from '@/hooks/useAuth'

export default function AdminModelsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/chat')
    }
  }, [router, user])

  if (user && user.role !== 'admin') {
    return null
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Models</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Manage available models and provider settings. This page is restricted to administrators.</p>
      <ModelTable />
    </main>
  )
}
