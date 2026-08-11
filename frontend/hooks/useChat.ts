'use client'

import { useCallback, useState } from 'react'

import { api, refreshAccessToken } from '@/lib/api'
import { consumeSseStream, type StreamErrorDetail, type StreamEvent } from '@/lib/stream'
import { useChatStore } from '@/store/chatStore'
import type { ChatWarning, Message, MessageRequestContext, RagCitation, SearchResult } from '@/types'

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
  retryMessageId?: string
  existingUserMessageId?: string
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
  const { messages, updateMessage, addMessage, removeMessage, setConversationError, attachWarningsToMessage, markMessageRetryContext } = useChatStore()
  const [loading, setLoading] = useState(false)
  const [conversationLoading, setConversationLoading] = useState(false)

  const buildRequestContext = useCallback(
    (conversationId: string, content: string, useSearch: boolean, useRag: boolean, userMessageId?: string | null): MessageRequestContext => ({
      conversation_id: conversationId,
      content,
      use_search: useSearch,
      use_rag: useRag,
      user_message_id: userMessageId ?? null,
    }),
    [],
  )

  const normalizeStreamError = useCallback((error: unknown): StreamErrorDetail => {
    if (error instanceof Error && 'detail' in error && error.detail && typeof error.detail === 'object') {
      return error.detail as StreamErrorDetail
    }

    if (error instanceof Error) {
      return { message: error.message }
    }

    return { message: 'Something went wrong while sending your message.' }
  }, [])

  const streamChatRequest = useCallback(
    async (conversationId: string, payload: { content: string; use_search: boolean; use_rag: boolean }) => {
      const authHeader = api.defaults.headers.common.Authorization

      const makeRequest = () =>
        fetch(getChatApiUrl(`/chat/${conversationId}/send`), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(typeof authHeader === 'string' ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(payload),
        })

      let response = await makeRequest()
      if (response.status === 401) {
        const token = await refreshAccessToken()
        if (token) {
          response = await fetch(getChatApiUrl(`/chat/${conversationId}/send`), {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })
        }
      }

      return response
    },
    [],
  )

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setConversationLoading(true)
      setConversationError(null)
      try {
        const { data } = await api.get<ConversationDetailResponse>(`/conversations/${conversationId}`)
        return data
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Failed to load the conversation.'
        setConversationError(detail)
        return null
      } finally {
        setConversationLoading(false)
      }
    },
    [setConversationError],
  )

  const sendMessage = useCallback(
    async (conversationId: string, content: string, useSearch = false, useRag = false, options?: SendMessageOptions) => {
      const trimmedContent = content.trim()
      if (!trimmedContent) {
        return null
      }

      const userMessageId = options?.existingUserMessageId ?? createMessageId()
      const requestContext = buildRequestContext(conversationId, trimmedContent, useSearch, useRag, userMessageId)

      if (!options?.existingUserMessageId) {
        const optimisticMessage: Message = {
          id: userMessageId,
          role: 'user',
          content: trimmedContent,
          request_context: requestContext,
        }
        addMessage(optimisticMessage)
      } else {
        markMessageRetryContext(userMessageId, requestContext)
      }

      const pendingAssistantMessageId = options?.retryMessageId ?? createMessageId()
      const pendingAssistantMessage: Message = {
        id: pendingAssistantMessageId,
        role: 'assistant',
        content: useSearch && useRag ? 'Searching sources and drafting a response…' : useSearch ? 'Searching the web and drafting a response…' : useRag ? 'Searching the knowledge base…' : 'Thinking… generating a response.',
        is_pending: true,
        is_error: false,
        retryable: false,
        retry_of_message_id: userMessageId,
        request_context: requestContext,
        warnings: [],
      }

      if (options?.retryMessageId) {
        updateMessage(options.retryMessageId, () => pendingAssistantMessage)
      } else {
        addMessage(pendingAssistantMessage)
      }

      setLoading(true)
      try {
        const response = await streamChatRequest(conversationId, {
          content: trimmedContent,
          use_search: useSearch,
          use_rag: useRag,
        })

        let finalEvent: StreamEvent | null = null
        let errorDetail: StreamErrorDetail | null = null
        const warnings: ChatWarning[] = []

        await consumeSseStream(response, (event) => {
          if (event.type === 'warning') {
            warnings.push({
              message: event.message ?? event.detail ?? 'A supporting source was unavailable for this response.',
              code: event.code,
              source: event.source,
              retryable: event.retryable,
            })
            attachWarningsToMessage(pendingAssistantMessageId, [...warnings])
            return
          }

          if (event.type === 'citations' && event.source === 'search') {
            const results = (event.results as SearchResult[] | undefined) ?? []
            updateMessage(userMessageId, (message) => ({ ...message, search_results: results }))
            updateMessage(pendingAssistantMessageId, (message) => ({
              ...message,
              content: message.content.startsWith('Searching') ? 'Search results found. Drafting the answer…' : message.content,
            }))
            return
          }

          if (event.type === 'citations' && event.source === 'rag') {
            const results = (event.results as RagCitation[] | undefined) ?? []
            updateMessage(userMessageId, (message) => ({ ...message, rag_results: results }))
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
              is_error: false,
              retryable: false,
              error_code: null,
              error_source: null,
              warnings,
            }))
            return
          }

          if (event.type === 'error') {
            const detail: StreamErrorDetail = {
              message: event.detail ?? 'Something went wrong while generating a response.',
              code: event.code,
              source: event.source,
              retryable: event.retryable,
            }
            errorDetail = detail
            updateMessage(pendingAssistantMessageId, () => ({
              id: pendingAssistantMessageId,
              role: 'assistant',
              content: detail.message,
              is_error: true,
              is_pending: false,
              retryable: detail.retryable ?? true,
              error_code: detail.code ?? null,
              error_source: detail.source ?? null,
              retry_of_message_id: userMessageId,
              request_context: requestContext,
              warnings,
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
        const detail = normalizeStreamError(error)

        updateMessage(pendingAssistantMessageId, () => ({
          id: pendingAssistantMessageId,
          role: 'assistant',
          content: detail.message,
          is_error: true,
          is_pending: false,
          retryable: detail.retryable ?? true,
          error_code: detail.code ?? null,
          error_source: detail.source ?? null,
          retry_of_message_id: userMessageId,
          request_context: requestContext,
          warnings: [],
        }))
        return useChatStore.getState().messages.find((message) => message.id === pendingAssistantMessageId) ?? null
      } finally {
        setLoading(false)
      }
    },
    [addMessage, attachWarningsToMessage, buildRequestContext, markMessageRetryContext, normalizeStreamError, streamChatRequest, updateMessage],
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      const targetMessage = useChatStore.getState().messages.find((message) => message.id === messageId)
      const requestContext = targetMessage?.request_context
      if (!targetMessage || !requestContext) {
        return null
      }

      return sendMessage(
        requestContext.conversation_id,
        requestContext.content,
        requestContext.use_search,
        requestContext.use_rag,
        {
          retryMessageId: messageId,
          existingUserMessageId: requestContext.user_message_id ?? undefined,
        },
      )
    },
    [sendMessage],
  )

  return {
    messages,
    loading,
    conversationLoading,
    loadConversation,
    sendMessage,
    retryMessage,
  }
}
