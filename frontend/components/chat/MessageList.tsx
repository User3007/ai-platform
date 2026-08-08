'use client'

import { MessageBubble } from '@/components/chat/MessageBubble'
import { useChatStore } from '@/store/chatStore'

export function MessageList() {
  const { messages } = useChatStore()
  const hasMessages = messages.length > 0

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#171717] md:p-5">
      {!hasMessages ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ready when you are</p>
          <p className="mt-3 text-lg font-medium text-slate-900 dark:text-white">Start an AI chat.</p>
          <p className="mt-2 max-w-2xl">Choose a model, ask a question, and optionally bring in web results for extra context.</p>
        </div>
      ) : null}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          isError={message.is_error}
          isPending={message.is_pending}
          searchResults={message.search_results}
            ragResults={message.rag_results}
        />
      ))}
    </div>
  )
}
