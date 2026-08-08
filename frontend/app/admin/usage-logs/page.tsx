'use client'

import { useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import type { UsageLog } from '@/types'

type UsageLogResponse = {
  items: UsageLog[]
  page: number
  limit: number
  total: number
}

const PAGE_SIZE = 25

type TrimmedMessage = UsageLog['context_analysis']['trimmed_messages'][number]

type TurnBlock = {
  turnNumber: number
  inputMessages: TrimmedMessage[]
  outputMessage: TrimmedMessage | null
}

type RoleTokenSummary = {
  role: string | null
  estimatedTokens: number
}

const SEARCH_CONTEXT_HEADER = 'Use the following web search results as supporting context when they are relevant.'

function summarizeSearchContext(content: string) {
  if (!content.includes(SEARCH_CONTEXT_HEADER)) {
    return content
  }

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const summarizedLines: string[] = ['Web search context (condensed):']
  let currentTitle = ''
  let currentUrl = ''
  let currentSnippet = ''

  const flushCurrent = () => {
    if (!currentTitle && !currentUrl && !currentSnippet) {
      return
    }

    const parts = [currentTitle || 'Untitled result']
    if (currentUrl) {
      parts.push(currentUrl)
    }
    if (currentSnippet) {
      parts.push(currentSnippet)
    }

    summarizedLines.push(`- ${parts.join(' — ')}`)
    currentTitle = ''
    currentUrl = ''
    currentSnippet = ''
  }

  for (const line of lines) {
    if (line === SEARCH_CONTEXT_HEADER || line.startsWith('Cite concrete details')) {
      continue
    }

    const titleMatch = line.match(/^\d+\.\s+(.*)$/)
    if (titleMatch) {
      flushCurrent()
      currentTitle = titleMatch[1]
      continue
    }

    if (line.startsWith('URL:')) {
      currentUrl = line.replace(/^URL:\s*/, '')
      continue
    }

    if (line.startsWith('Snippet:')) {
      currentSnippet = line.replace(/^Snippet:\s*/, '').slice(0, 180)
      continue
    }
  }

  flushCurrent()

  return summarizedLines.join('\n')
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  return `${value.toFixed(1)}%`
}

function roleBadgeClass(role: string | null) {
  if (role === 'user') {
    return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  }
  if (role === 'assistant') {
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600'
  }
  if (role === 'system') {
    return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
}

function buildTurnBlocks(messages: UsageLog['context_analysis']['trimmed_messages']): TurnBlock[] {
  const turns: TurnBlock[] = []
  let currentTurn: TurnBlock | null = null
  let pendingPrelude: TrimmedMessage[] = []
  let runningHistory: TrimmedMessage[] = []

  for (const message of messages) {
    if (message.role === 'user') {
      const pendingInputMessages: TrimmedMessage[] = [...runningHistory, ...pendingPrelude, message]

      currentTurn = {
        turnNumber: turns.length + 1,
        inputMessages: pendingInputMessages,
        outputMessage: null,
      }
      pendingPrelude = []
      turns.push(currentTurn)
      runningHistory = pendingInputMessages
      continue
    }

    if (!currentTurn) {
      if (message.role === 'assistant') {
        const previousTurn = turns[turns.length - 1]

        if (previousTurn && !previousTurn.outputMessage) {
          previousTurn.outputMessage = message
        } else {
          turns.push({
            turnNumber: turns.length + 1,
            inputMessages: [],
            outputMessage: message,
          })
        }

        pendingPrelude = []
        runningHistory = [...runningHistory, message]
      } else {
        pendingPrelude.push(message)
      }

      continue
    }

    if (message.role === 'assistant') {
      currentTurn.outputMessage = message
      runningHistory = [...currentTurn.inputMessages, message]
      currentTurn = null
      continue
    }

    currentTurn.inputMessages.push(message)
    runningHistory = [...currentTurn.inputMessages]
  }

  return turns
}

function summarizeRoleTokens(messages: TrimmedMessage[]): RoleTokenSummary[] {
  const totals = new Map<string, number>()
  const roleOrder: string[] = []

  for (const message of messages) {
    const role = message.role ?? 'unknown'
    if (!totals.has(role)) {
      roleOrder.push(role)
      totals.set(role, 0)
    }

    totals.set(role, (totals.get(role) ?? 0) + message.estimated_tokens)
  }

  return roleOrder.map((role) => ({
    role,
    estimatedTokens: totals.get(role) ?? 0,
  }))
}

function renderRawTranscript(messages: TrimmedMessage[]) {
  return messages
    .map(
      (message) =>
        `<${message.role ?? 'unknown'}>\n${message.role === 'system' ? summarizeSearchContext(message.content) : message.content}`,
    )
    .join('\n\n')
}

export default function AdminUsageLogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<UsageLog | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadLogs = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data } = await api.get<UsageLogResponse>('/admin/usage-logs', {
          params: { page, limit: PAGE_SIZE },
        })

        if (cancelled) {
          return
        }

        setLogs(data.items)
        setTotal(data.total)
      } catch {
        if (!cancelled) {
          setError('Failed to load usage logs.')
          setLogs([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadLogs()

    return () => {
      cancelled = true
    }
  }, [page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const totalTokens = useMemo(() => logs.reduce((sum, log) => sum + log.tokens_used, 0), [logs])
  const selectedTurns = useMemo(
    () => (selectedLog ? buildTurnBlocks(selectedLog.context_analysis.trimmed_messages) : []),
    [selectedLog],
  )

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usage Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Inspect token usage and model inputs for each chat turn.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Entries</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717]">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Page tokens</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{totalTokens.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#171717]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-600 dark:bg-[#111111] dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Conversation</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Raw turn payloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={6}>
                    Loading usage logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-red-400" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={6}>
                    No usage data yet. Logs appear after chat activity.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{log.user_email}</div>
                      <div className="text-xs text-slate-500">{log.user_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{log.conversation_title || 'Untitled conversation'}</div>
                      <div className="text-xs text-slate-500">{log.conversation_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{log.model_name ?? 'Unknown model'}</div>
                      <div className="text-xs text-slate-500">{log.provider_name ?? 'Unknown provider'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{log.tokens_used.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-[#111111]">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>Msgs: <span className="text-slate-900 dark:text-white">{log.context_analysis.message_count}</span></span>
                          <span>Turns: <span className="text-slate-900 dark:text-white">{log.context_analysis.turn_count}</span></span>
                          <span>User: <span className="text-slate-900 dark:text-white">{log.context_analysis.user_message_count}</span></span>
                          <span>Assistant: <span className="text-slate-900 dark:text-white">{log.context_analysis.assistant_message_count}</span></span>
                          <span>System: <span className="text-slate-900 dark:text-white">{log.context_analysis.system_message_count}</span></span>
                          <span>Search: <span className="text-slate-900 dark:text-white">{log.context_analysis.search_message_count}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>Chars: <span className="text-slate-900 dark:text-white">{log.context_analysis.input_characters.toLocaleString()}</span></span>
                          <span>Est. input tokens: <span className="text-slate-900 dark:text-white">{log.context_analysis.estimated_input_tokens.toLocaleString()}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>Model window: <span className="text-slate-900 dark:text-white">{log.context_analysis.context_window?.toLocaleString() ?? '—'}</span></span>
                          <span>Effective limit: <span className="text-slate-900 dark:text-white">{log.context_analysis.effective_context_limit?.toLocaleString() ?? '—'}</span></span>
                          <span>Usage: <span className="text-slate-900 dark:text-white">{formatPercent(log.context_analysis.context_utilization_percent)}</span></span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Actual raw text parsed into the model</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open a focused popup to inspect each turn without expanding the table row.</div>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
                            onClick={() => setSelectedLog(log)}
                          >
                            View payloads
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111111]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Raw turn payloads</div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedLog.conversation_title || 'Untitled conversation'}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>{selectedLog.user_email}</span>
                  <span>{formatDate(selectedLog.created_at)}</span>
                  <span>{selectedLog.model_name ?? 'Unknown model'}</span>
                  <span>{selectedLog.tokens_used.toLocaleString()} tokens</span>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {selectedTurns.map((turn) => (
                  <div key={`${selectedLog.id}-turn-${turn.turnNumber}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#171717]">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Turn {turn.turnNumber}</div>
                      <div className="flex flex-wrap gap-2">
                        {summarizeRoleTokens(turn.inputMessages).map((summary, index) => (
                          <span
                            key={`${selectedLog.id}-turn-${turn.turnNumber}-badge-${index}`}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${roleBadgeClass(summary.role)}`}
                          >
                            {summary.role ?? 'unknown'} · ~{summary.estimatedTokens} tok
                          </span>
                        ))}
                        {turn.outputMessage ? (
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${roleBadgeClass(turn.outputMessage.role)}`}
                          >
                            output · ~{turn.outputMessage.estimated_tokens} tok
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Input payload</div>
                        <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-5 text-slate-200 whitespace-pre-wrap break-words">{renderRawTranscript(turn.inputMessages)}</pre>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Assistant output</div>
                        <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-5 text-slate-200 whitespace-pre-wrap break-words">{turn.outputMessage ? renderRawTranscript([turn.outputMessage]) : 'No assistant output captured for this turn.'}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}