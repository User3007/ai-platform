'use client'

import { useCallback, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import { parseSseChunk } from '@/lib/stream'
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
        const response = await api.post(
          `/chat/${conversationId}/send`,
          { content: trimmedContent, use_search: useSearch, use_rag: useRag },
          { responseType: 'text' },
        )
        const events = typeof response.data === 'string' ? parseSseChunk(response.data) : []
        const searchResults = (events.find((event) => event.type === 'search_result')?.results as SearchResult[] | undefined) ?? null
        const ragResults = (events.find((event) => event.type === 'rag_result')?.results as RagCitation[] | undefined) ?? null
        const assistantContent = events
          .filter((event) => event.type === 'token')
          .map((event) => event.content ?? '')
          .join('')
        const errorEvent = events.find((event) => event.type === 'error')

        if (searchResults?.length) {
          updateMessage(optimisticMessage.id, (message) => ({ ...message, search_results: searchResults }))
          updateMessage(pendingAssistantMessageId, (message) => ({
            ...message,
            content: 'Search results found. Finalizing the answer…',
          }))
        }

        if (ragResults?.length) {
          updateMessage(optimisticMessage.id, (message) => ({ ...message, rag_results: ragResults }))
          updateMessage(pendingAssistantMessageId, (message) => ({
            ...message,
            content: searchResults?.length ? 'Search and knowledge base results found. Finalizing the answer…' : 'Knowledge base results found. Finalizing the answer…',
          }))
        }

        if (errorEvent) {
          updateMessage(pendingAssistantMessageId, () => ({
            id: pendingAssistantMessageId,
            role: 'assistant',
            content: errorEvent.detail ?? 'Something went wrong while generating a response.',
            is_error: true,
            is_pending: false,
          }))
          return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
        }

        updateMessage(pendingAssistantMessageId, (message) => ({
          ...message,
          content: assistantContent || 'Response received.',
          tokens_used: events.find((event) => event.type === 'done')?.tokens_used ?? null,
          is_pending: false,
        }))
        await options?.onResponseComplete?.()
        return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
      } catch (error) {
        const detail = axios.isAxiosError(error)
          ? (error.response?.data?.detail ?? error.message)
          : 'Something went wrong while sending your message.'

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
