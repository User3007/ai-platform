'use client'

import { useCallback, useState } from 'react'

import { api } from '@/lib/api'
import { consumeSseStream, type StreamEvent } from '@/lib/stream'
import { useChatStore } from '@/store/chatStore'
import type { Message, RagCitation, SearchResult } from '@/types'

function createMessageId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

type ConversationDetailResponse = {
  id: string
  title: string
  model_id: string | null
  messages: Message[]
}

type SendMessageOptions = {
  onResponseComplete?: () => Promise<void> | void
}

function getChatApiUrl(path: string) {
  const baseUrl = api.defaults.baseURL ?? ''

  if (/^https?:\/\//.test(baseUrl)) {
    return `${baseUrl}${path}`
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${baseUrl}${path}`
  }

  return `${baseUrl}${path}`
}

export function useChat() {
  const { messages, updateMessage, addMessage } = useChatStore()
  const [loading, setLoading] = useState(false)

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setLoading(true)
      try {
        const { data } = await api.get<ConversationDetailResponse>(`/conversations/${conversationId}`)
        return data
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const sendMessage = useCallback(
    async (conversationId: string, content: string, useSearch = false, useRag = false, options?: SendMessageOptions) => {
      const trimmedContent = content.trim()
      if (!trimmedContent) {
        return null
      }

      const optimisticMessage: Message = {
        id: createMessageId(),
        role: 'user',
        content: trimmedContent,
      }
      addMessage(optimisticMessage)

      const pendingAssistantMessageId = createMessageId()
      addMessage({
        id: pendingAssistantMessageId,
        role: 'assistant',
        content: useSearch && useRag ? 'Searching sources and drafting a response…' : useSearch ? 'Searching the web and drafting a response…' : useRag ? 'Searching the knowledge base…' : 'Thinking… generating a response.',
        is_pending: true,
      })

      setLoading(true)
      try {
        const authHeader = api.defaults.headers.common.Authorization
        const response = await fetch(getChatApiUrl(`/chat/${conversationId}/send`), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(typeof authHeader === 'string' ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify({ content: trimmedContent, use_search: useSearch, use_rag: useRag }),
        })

        let finalEvent: StreamEvent | null = null
        let errorDetail: string | null = null

        await consumeSseStream(response, (event) => {
          if (event.type === 'citations' && event.source === 'search') {
            const results = (event.results as SearchResult[] | undefined) ?? []
            updateMessage(optimisticMessage.id, (message) => ({ ...message, search_results: results }))
            updateMessage(pendingAssistantMessageId, (message) => ({
              ...message,
              content: message.content.startsWith('Searching') ? 'Search results found. Drafting the answer…' : message.content,
            }))
            return
          }

          if (event.type === 'citations' && event.source === 'rag') {
            const results = (event.results as RagCitation[] | undefined) ?? []
            updateMessage(optimisticMessage.id, (message) => ({ ...message, rag_results: results }))
            updateMessage(pendingAssistantMessageId, (message) => ({
              ...message,
              content: message.content.startsWith('Searching') ? 'Knowledge base results found. Drafting the answer…' : message.content,
            }))
            return
          }

          if (event.type === 'message_delta') {
            updateMessage(pendingAssistantMessageId, (message) => ({
              ...message,
              content:
                message.is_pending && (message.content.startsWith('Searching') || message.content.startsWith('Thinking'))
                  ? event.delta ?? ''
                  : `${message.content}${event.delta ?? ''}`,
            }))
            return
          }

          if (event.type === 'completion') {
            finalEvent = event
            updateMessage(pendingAssistantMessageId, (message) => ({
              ...message,
              content: event.content || message.content || 'Response received.',
              tokens_used: event.tokens_used ?? null,
              is_pending: false,
            }))
            return
          }

          if (event.type === 'error') {
            const detail = event.detail ?? 'Something went wrong while generating a response.'
            errorDetail = detail
            updateMessage(pendingAssistantMessageId, () => ({
              id: pendingAssistantMessageId,
              role: 'assistant',
              content: detail,
              is_error: true,
              is_pending: false,
            }))
          }
        })

        if (errorDetail) {
          return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
        }

        if (!finalEvent) {
          updateMessage(pendingAssistantMessageId, (message) => ({
            ...message,
            is_pending: false,
          }))
        }

        await options?.onResponseComplete?.()
        return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Something went wrong while sending your message.'

        updateMessage(pendingAssistantMessageId, () => ({
          id: pendingAssistantMessageId,
          role: 'assistant',
          content: typeof detail === 'string' ? detail : 'Something went wrong while sending your message.',
          is_error: true,
          is_pending: false,
        }))
        return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
      } finally {
        setLoading(false)
      }
    },
    [addMessage, updateMessage],
  )

  return {
    messages,
    loading,
    loadConversation,
    sendMessage,
  }
}
