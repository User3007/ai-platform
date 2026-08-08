'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'

import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import { useChat } from '@/hooks/useChat'
import { useConversations } from '@/hooks/useConversations'
import { useChatStore } from '@/store/chatStore'

export default function ConversationPage() {
  const params = useParams<{ id: string }>()
  const conversationId = typeof params?.id === 'string' ? params.id : ''
  const { loadConversation } = useChat()
  const { upsertConversation } = useConversations()
  const setMessages = useChatStore((state) => state.setMessages)
  const conversations = useChatStore((state) => state.conversations)
  const loadedConversationIdRef = useRef<string | null>(null)
  const loadRequestIdRef = useRef(0)

  const conversationTitle = useMemo(() => {
    if (!conversationId) {
      return 'New chat'
    }

    return conversations.find((conversation) => conversation.id === conversationId)?.title ?? 'New chat'
  }, [conversationId, conversations])

  useEffect(() => {
    if (!conversationId) {
      loadedConversationIdRef.current = null
      setMessages([])
      return
    }

    if (loadedConversationIdRef.current === conversationId) {
      return
    }

    loadedConversationIdRef.current = conversationId
    setMessages([])
    const requestId = ++loadRequestIdRef.current

    void loadConversation(conversationId).then((conversation) => {
      if (!conversation || loadRequestIdRef.current !== requestId) {
        return
      }

      upsertConversation({
        id: conversation.id,
        title: conversation.title,
        model_id: conversation.model_id,
      })

      const currentMessages = useChatStore.getState().messages
      if (currentMessages.length > conversation.messages.length) {
        return
      }

      setMessages(conversation.messages)
    })
  }, [conversationId, loadConversation, setMessages, upsertConversation])

  return (
    <main className="flex min-h-[calc(100vh-89px)] flex-col gap-5 rounded-[28px] border border-slate-200 bg-[#fcfcfc] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] md:m-0 md:ml-6 md:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Conversation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{conversationTitle}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Continue the chat and keep the context in one place.</p>
        </div>
      </div>
      <MessageList />
      <ChatInput conversationId={conversationId} />
    </main>
  )
}
