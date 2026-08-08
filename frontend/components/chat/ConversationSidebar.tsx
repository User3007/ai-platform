'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { useConversations } from '@/hooks/useConversations'

export function ConversationSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { conversations, loading, deleteConversation } = useConversations()

  const handleDelete = async (conversationId: string) => {
    await deleteConversation(conversationId)

    if (pathname === `/chat/${conversationId}`) {
      router.push('/chat')
    }
  }

  return (
    <aside className="relative z-10 flex min-h-[calc(100vh-89px)] flex-col rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#111111]/90 md:sticky md:top-[105px] md:max-h-[calc(100vh-121px)]">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Workspace</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Chats</h2>
        </div>
        <Link
          href="/chat"
          className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          AI Chat
        </Link>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {conversations.map((conversation) => (
          (() => {
            const isActive = pathname === `/chat/${conversation.id}`

            return (
          <div
            key={conversation.id}
            className={`group flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border p-2 text-sm transition ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-black'
                : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-[#171717] dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-[#1d1d1d]'
            }`}
          >
            <Link href={`/chat/${conversation.id}`} className="block min-w-0 flex-1 px-2 py-2">
              <div className="truncate font-medium">{conversation.title}</div>
              <div className={`mt-1 text-xs ${isActive ? 'text-white/70 dark:text-black/60' : 'text-slate-500 dark:text-slate-400'}`}>
                Open conversation
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void handleDelete(conversation.id)}
              className={`shrink-0 rounded-xl px-2 py-1 text-xs font-medium transition ${
                isActive
                  ? 'text-white/80 hover:bg-black/10 hover:text-white dark:text-black/70 dark:hover:bg-black/10 dark:hover:text-black'
                  : 'text-slate-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#232323] dark:hover:text-slate-200'
              }`}
            >
              Remove
            </button>
          </div>
            )
          })()
        ))}
        {!loading && conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-white">No chats yet</p>
            <p className="mt-2">Start an AI chat to begin and your conversations will appear here.</p>
          </div>
        ) : null}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#171717]" />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
