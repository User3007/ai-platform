import ReactMarkdown from 'react-markdown'

import type { ChatWarning, RagCitation, SearchResult } from '@/types'

type Props = {
  messageId?: string
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
  isPending?: boolean
  retryable?: boolean
  searchResults?: SearchResult[] | null
  ragResults?: RagCitation[] | null
  warnings?: ChatWarning[] | null
  onRetry?: (messageId: string) => void
}

async function copyText(content: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
    return true
  }

  if (typeof document === 'undefined') {
    return false
  }

  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

function extractCitations(content: string) {
  const matches = content.match(/https?:\/\/[^\s)]+/g) ?? []
  return Array.from(new Set(matches))
}

export function MessageBubble({ messageId, role, content, isError = false, isPending = false, retryable = false, searchResults, ragResults, warnings, onRetry }: Props) {
  const handleCopy = async () => {
    try {
      await copyText(content)
    } catch {
      // Ignore clipboard failures to avoid crashing the UI.
    }
  }

  const citations = role === 'assistant' ? extractCitations(content) : []
  const isUser = role === 'user'
  const hasWarnings = Boolean(warnings?.length)
  const markdownClassName = isUser
    ? 'prose prose-invert max-w-none break-words prose-p:my-3 prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-black/20 prose-pre:p-4 prose-code:rounded prose-code:bg-black/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.95em] prose-code:before:content-none prose-code:after:content-none prose-a:text-white prose-a:underline prose-strong:text-white prose-headings:text-white prose-blockquote:border-white/30 prose-blockquote:text-white/80 prose-li:my-1 dark:prose-p:text-slate-800 dark:prose-li:text-slate-800 dark:prose-strong:text-slate-900 dark:prose-headings:text-slate-900 dark:prose-a:text-slate-900 dark:prose-blockquote:text-slate-700 dark:prose-blockquote:border-slate-300'
    : 'prose max-w-none break-words prose-slate dark:prose-invert prose-p:my-3 prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-slate-900 prose-pre:p-4 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.95em] prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-slate-800 prose-a:break-all prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600 prose-li:my-1'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group w-full max-w-3xl rounded-[24px] border p-4 shadow-sm transition md:p-5 ${
          isUser
            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
            : isError
              ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-100'
              : isPending
                ? 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-[#202020] dark:text-slate-100'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-[#212121] dark:text-slate-100'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isUser ? 'text-white/70 dark:text-black/60' : 'text-slate-500 dark:text-slate-400'}`}>
            {isUser ? 'You' : isError ? 'Error' : 'Assistant'}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isPending}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              isUser
                ? 'border-white/20 text-white/80 opacity-100 hover:bg-white/10 dark:border-black/10 dark:text-black/70 dark:hover:bg-black/5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
                : 'border-slate-300 text-slate-600 opacity-100 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-white/10 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
            }`}
          >
            Copy
          </button>
        </div>

        {isError && retryable && messageId && onRetry ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-red-300/70 bg-red-100/70 px-3 py-2 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-100">
            <span>You can retry this response.</span>
            <button
              type="button"
              onClick={() => onRetry(messageId)}
              className="rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:bg-red-200/60 dark:hover:bg-red-900/40"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className={markdownClassName}>
          <ReactMarkdown
            components={{
              a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {isPending ? (
          <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500" />
            Assistant is responding
          </div>
        ) : null}
      {role === 'assistant' && hasWarnings ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Response notes</div>
          <div className="space-y-2">
            {warnings?.map((warning, index) => (
              <div key={`${warning.code ?? warning.source ?? 'warning'}-${index}`} className="rounded-xl border border-amber-200/80 bg-white/70 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-950/20">
                <div>{warning.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {role === 'user' && searchResults?.length ? (
        <div className={`mt-4 rounded-2xl border p-4 shadow-sm ${isUser ? 'border-white/15 bg-white/10 dark:border-black/10 dark:bg-black/5' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1c1c1c]'}`}>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span className={`inline-block h-2 w-2 rounded-full ${isUser ? 'bg-white/60 dark:bg-black/40' : 'bg-slate-400 dark:bg-slate-500'}`} />
            Web sources used
          </div>
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div key={result.url} className={`rounded-xl border p-4 text-sm transition ${isUser ? 'border-white/15 bg-white/10 text-white dark:border-black/10 dark:bg-black/5 dark:text-black' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#232323] dark:text-slate-100 dark:hover:bg-[#2a2a2a]'}`}>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block text-base font-medium leading-6 underline-offset-4 hover:underline ${isUser ? 'text-white dark:text-black' : 'text-slate-900 dark:text-white'}`}
                >
                  {result.title}
                </a>
                {result.url ? <div className={`mt-2 break-all text-xs ${isUser ? 'text-white/70 dark:text-black/60' : 'text-slate-500 dark:text-slate-400'}`}>{result.url}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {role === 'user' && ragResults?.length ? (
        <div className={`mt-4 rounded-2xl border p-4 shadow-sm ${isUser ? 'border-white/15 bg-white/10 dark:border-black/10 dark:bg-black/5' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1c1c1c]'}`}>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span className={`inline-block h-2 w-2 rounded-full ${isUser ? 'bg-white/60 dark:bg-black/40' : 'bg-slate-400 dark:bg-slate-500'}`} />
            Knowledge base sources used
          </div>
          <div className="space-y-2">
            {ragResults.map((result) => (
              <div key={`${result.document_id}-${result.chunk_index}`} className={`rounded-xl border p-4 text-sm transition ${isUser ? 'border-white/15 bg-white/10 text-white dark:border-black/10 dark:bg-black/5 dark:text-black' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#232323] dark:text-slate-100 dark:hover:bg-[#2a2a2a]'}`}>
                <div className={`text-base font-medium leading-6 ${isUser ? 'text-white dark:text-black' : 'text-slate-900 dark:text-white'}`}>{result.document_name}</div>
                <div className={`mt-2 text-xs ${isUser ? 'text-white/70 dark:text-black/60' : 'text-slate-500 dark:text-slate-400'}`}>Chunk {result.chunk_index + 1}</div>
                <div className="mt-3 whitespace-pre-wrap leading-6">{result.content}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {role === 'assistant' && citations.length ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#1c1c1c]">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
            Citations
          </div>
          <div className="space-y-2">
            {citations.map((citation) => (
              <a
                key={citation}
                href={citation}
                target="_blank"
                rel="noreferrer"
                className="block break-all rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 underline-offset-4 hover:underline dark:border-slate-700 dark:bg-[#232323] dark:text-slate-200"
              >
                {citation}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}
