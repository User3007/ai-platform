'use client'

import { useEffect, useState } from 'react'

import { SystemPromptManager } from '@/components/admin/SystemPromptManager'
import { AppShell } from '@/components/layout/AppShell'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { usePreferencesStore } from '@/store/preferencesStore'
import type { AiTonePreset, ModelConfig } from '@/types'

type ModelListResponse = {
  items: ModelConfig[]
}

const AI_TONE_OPTIONS: Array<{ value: AiTonePreset; label: string; description: string }> = [
  { value: 'default', label: 'Default', description: 'Balanced and neutral responses that follow the base system prompt.' },
  { value: 'professional', label: 'Professional', description: 'Clear, polished, and businesslike wording.' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, and conversational replies.' },
  { value: 'concise', label: 'Concise', description: 'Shorter answers with minimal extra detail.' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const {
    selectedModelId,
    defaultWebSearch,
    autoSummarizeTitles,
    chatDensity,
    aiTonePreset,
    aiToneCustomInstruction,
    setSelectedModelId,
    setDefaultWebSearch,
    setAutoSummarizeTitles,
    setChatDensity,
    setAiTonePreset,
    setAiToneCustomInstruction,
  } = usePreferencesStore()
  const [models, setModels] = useState<ModelConfig[]>([])

  useEffect(() => {
    void api.get<ModelListResponse>('/models').then(({ data }) => {
      setModels(data.items)
    })
  }, [])

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-81px)] bg-[#fcfcfc] p-6 dark:bg-black">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the look and feel of your workspace.</p>

        <section className="mt-8 max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
          <div>
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Appearance</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose how the interface looks across the app.</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { value: 'system', label: 'System', description: 'Follow your device appearance automatically.' },
              { value: 'dark', label: 'Dark', description: 'Best for low-light environments.' },
              { value: 'light', label: 'Light', description: 'Bright interface for daytime use.' },
            ].map((option) => {
              const isActive = theme === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value as 'dark' | 'light' | 'system')}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-200 dark:border-slate-500 dark:bg-[#202020] dark:ring-slate-700'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-[#111111] dark:hover:border-slate-600 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                    <span
                      className={`h-3 w-3 rounded-full ${
                        isActive ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-6 max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
          <div>
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Chat preferences</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the defaults used when you start a new chat.</p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Default model</span>
              <select
                value={selectedModelId ?? ''}
                onChange={(event) => setSelectedModelId(event.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100 dark:focus:border-slate-500"
              >
                <option value="">Use the first available model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.display_name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">Used as the starting model for new chats when available.</span>
            </label>

            <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111111]">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Web search by default</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start new messages with Brave search enabled. You can still toggle it per message.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={defaultWebSearch}
                onClick={() => setDefaultWebSearch(!defaultWebSearch)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  defaultWebSearch ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition dark:bg-black ${
                    defaultWebSearch ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111111]">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Automatic chat titles</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate a better title after the first assistant response in a new chat.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoSummarizeTitles}
                onClick={() => setAutoSummarizeTitles(!autoSummarizeTitles)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  autoSummarizeTitles ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition dark:bg-black ${
                    autoSummarizeTitles ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Chat density</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose how spacious the chat layout feels.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'comfortable', label: 'Comfortable', description: 'More breathing room between messages.' },
                  { value: 'compact', label: 'Compact', description: 'Tighter spacing for denser reading.' },
                ].map((option) => {
                  const isActive = chatDensity === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChatDensity(option.value as 'comfortable' | 'compact')}
                      className={`rounded-xl border p-4 text-left transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-200 dark:border-slate-500 dark:bg-[#202020] dark:ring-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-[#111111] dark:hover:border-slate-600 dark:hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                        <span
                          className={`h-3 w-3 rounded-full ${
                            isActive ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">AI tone</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose how the assistant should sound in your chats.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {AI_TONE_OPTIONS.map((option) => {
                  const isActive = aiTonePreset === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAiTonePreset(option.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-200 dark:border-slate-500 dark:bg-[#202020] dark:ring-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-[#111111] dark:hover:border-slate-600 dark:hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                        <span
                          className={`h-3 w-3 rounded-full ${
                            isActive ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Custom tone guidance</span>
              <textarea
                value={aiToneCustomInstruction}
                onChange={(event) => setAiToneCustomInstruction(event.target.value)}
                rows={4}
                maxLength={1000}
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100 dark:focus:border-slate-500"
                placeholder="Optional: e.g. Be calm, practical, and explain tradeoffs clearly."
              />
              <span className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Optional extra guidance layered on top of your selected tone.</span>
                <span>{aiToneCustomInstruction.length}/1000</span>
              </span>
            </label>
          </div>
        </section>

        {user?.role === 'admin' ? <SystemPromptManager /> : null}
      </main>
    </AppShell>
  )
}
