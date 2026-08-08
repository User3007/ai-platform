'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useChat } from '@/hooks/useChat'
import { useConversations } from '@/hooks/useConversations'
import { usePreferencesStore } from '@/store/preferencesStore'
import { useChatStore } from '@/store/chatStore'

type ChatInputProps = {
  conversationId?: string
}

export function ChatInput({ conversationId: initialConversationId }: ChatInputProps) {
  const router = useRouter()
  const { selectedModelId, conversations } = useChatStore()
  const { defaultWebSearch, autoSummarizeTitles } = usePreferencesStore()
  const { sendMessage, loading } = useChat()
  const { createConversation, summarizeConversationTitle } = useConversations()
  const [content, setContent] = useState('')
  const [useWebSearch, setUseWebSearch] = useState(defaultWebSearch)
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true)

  useEffect(() => {
    setUseWebSearch(defaultWebSearch)
  }, [defaultWebSearch])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    setContent('')

    let conversationId = initialConversationId ?? ''
    if (!conversationId) {
      const conversation = await createConversation({
        title: trimmedContent.slice(0, 40),
        ...(selectedModelId ? { model_id: selectedModelId } : {}),
      })
      conversationId = conversation.id
      router.push(`/chat/${conversationId}`)
    }

    const conversation = conversations.find((item) => item.id === conversationId)
    const shouldSummarize = autoSummarizeTitles && (!conversation || conversation.title === 'New chat')

    await sendMessage(conversationId, trimmedContent, useWebSearch, useKnowledgeBase, {
      onResponseComplete: shouldSummarize
        ? async () => {
            await summarizeConversationTitle(conversationId)
          }
        : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-md dark:border-slate-800 dark:bg-[#171717] dark:focus-within:border-slate-700 md:p-5">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="min-h-28 w-full resize-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        placeholder="Type your message..."
      />
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
          <button
            type="button"
            role="switch"
            aria-checked={useWebSearch}
            onClick={() => setUseWebSearch((value) => !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              useWebSearch ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition dark:bg-black ${
                useWebSearch ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="flex flex-col">
            <span className="font-medium">Use web search</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Fetch Brave results for this message</span>
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
          <button
            type="button"
            role="switch"
            aria-checked={useKnowledgeBase}
            onClick={() => setUseKnowledgeBase((value) => !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              useKnowledgeBase ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition dark:bg-black ${
                useKnowledgeBase ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="flex flex-col">
            <span className="font-medium">Use knowledge base</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Search admin-uploaded documents for this message</span>
          </span>
        </label>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  )
}
