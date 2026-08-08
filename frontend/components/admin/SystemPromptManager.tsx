'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import type { SystemPromptSettings } from '@/types'

const DEFAULT_SYSTEM_PROMPT =
  'You are AI Platform Assistant, a helpful, accurate, and concise assistant for internal users. Give direct answers first, then add brief supporting detail when useful. If web search context is provided, use it carefully and cite concrete details from it when relevant. If information is uncertain or missing, say so clearly instead of guessing.'

export function SystemPromptManager() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
    }

    return fallback
  }

  const loadSystemPrompt = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<SystemPromptSettings>('/admin/settings/system-prompt')
      setSystemPrompt(data.system_prompt)
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load system prompt.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSystemPrompt()
  }, [loadSystemPrompt])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data } = await api.patch<SystemPromptSettings>('/admin/settings/system-prompt', {
        system_prompt: systemPrompt,
      })
      setSystemPrompt(data.system_prompt)
      setSuccess('System prompt saved.')
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to save system prompt.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
      <div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Admin system prompt</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set the global system instruction applied to normal chat replies. This does not affect automatic title summarization.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-200">System prompt</span>
          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            rows={10}
            maxLength={12000}
            className="min-h-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100 dark:focus:border-slate-500"
            placeholder="You are a helpful assistant..."
          />
          <span className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Leave empty to disable the global system prompt.</span>
            <span>{systemPrompt.length}/12000</span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            type="submit"
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save prompt'}
          </button>
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
            type="button"
            onClick={() => {
              setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
              setError(null)
              setSuccess('Default system prompt restored locally. Save to apply it.')
            }}
            disabled={loading || saving}
          >
            Reset to default
          </button>
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
            type="button"
            onClick={() => void loadSystemPrompt()}
            disabled={loading || saving}
          >
            {loading ? 'Loading...' : 'Reload'}
          </button>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-500 dark:text-emerald-400">{success}</p> : null}
      </form>
    </section>
  )
}