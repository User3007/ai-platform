'use client'

import { useEffect } from 'react'

import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { useChatStore } from '@/store/chatStore'

export default function ChatPage() {
  const clearMessages = useChatStore((state) => state.clearMessages)
  const pendingChatRedirect = useChatStore((state) => state.pendingChatRedirect)

  useEffect(() => {
    if (pendingChatRedirect) {
      return
    }

    clearMessages()
  }, [clearMessages, pendingChatRedirect])

  return (
    <main className="flex min-h-[calc(100vh-89px)] flex-col gap-5 rounded-[28px] border border-slate-200 bg-[#fcfcfc] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] md:m-0 md:ml-6 md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Workspace chat</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI Chat</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick up where you left off or start a new chat.</p>
        </div>
        <ModelSelector />
      </div>
      <MessageList />
      <ChatInput />
    </main>
  )
}
