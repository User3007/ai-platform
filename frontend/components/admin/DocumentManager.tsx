'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import type { RagDocument } from '@/types'

type DocumentListResponse = {
  items: RagDocument[]
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<RagDocument[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
      if (error.message?.trim()) {
        return error.message
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message
    }
    return fallback
  }

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<DocumentListResponse>('/admin/rag/documents')
      setDocuments(data.items)
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load documents.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Choose a file to upload.')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/admin/rag/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
      await loadDocuments()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to upload document.'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    setError(null)
    try {
      await api.delete(`/admin/rag/documents/${documentId}`)
      await loadDocuments()
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to delete document.'))
    }
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717] md:p-5">
      <form className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111111]" onSubmit={handleUpload}>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upload knowledge base documents</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Supported: PDF, TXT, MD, DOCX, CSV, XLSX. Uploaded documents are shared across chat users.</p>
        </div>
        <input
          type="file"
          accept=".pdf,.txt,.md,.docx,.csv,.xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300"
        />
        <button
          className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          type="submit"
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </form>

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading documents...</p> : null}
        {documents.map((document) => (
          <div key={document.id} className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-[#111111] md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="font-medium text-slate-900 dark:text-white">{document.original_filename}</div>
              <div className="text-slate-500 dark:text-slate-400">
                {document.status} · {document.chunk_count} chunks · {(document.size_bytes / 1024).toFixed(1)} KB
              </div>
              {document.error_message ? <div className="text-red-500">{document.error_message}</div> : null}
            </div>
            <button
              className="rounded-full border border-red-200 px-3 py-1 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
              onClick={() => void handleDelete(document.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        ))}
        {!loading && documents.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-400">No documents uploaded yet.</p> : null}
      </div>
    </div>
  )
}