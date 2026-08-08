'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { DocumentManager } from '@/components/admin/DocumentManager'
import { useAuth } from '@/hooks/useAuth'

export default function AdminDocumentsPage() {
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
      <h1 className="text-2xl font-semibold">Documents</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Upload and manage the shared knowledge base used by RAG chat.</p>
      <DocumentManager />
    </main>
  )
}