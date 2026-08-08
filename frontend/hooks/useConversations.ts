'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import { api } from '@/lib/api'
import { useChatStore } from '@/store/chatStore'
import type { Conversation } from '@/types'

type ConversationListResponse = {
  items: Conversation[]
}

export function useConversations() {
  const { conversations, setConversations } = useChatStore()
  const [loading, setLoading] = useState(false)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ConversationListResponse>('/conversations')
      setConversations(data.items)
      return data.items
    } finally {
      setLoading(false)
    }
  }, [setConversations])

  const createConversation = useCallback(
    async (payload: { title?: string; model_id?: string | null }) => {
      const requestPayload = {
        ...payload,
        model_id: payload.model_id || undefined,
      }

      const { data } = await api.post<Conversation>('/conversations', requestPayload)
      setConversations((currentConversations) => [data, ...currentConversations.filter((conversation) => conversation.id !== data.id)])
      return data
    },
    [setConversations],
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await api.delete(`/conversations/${conversationId}`)
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error
        }
      }

      setConversations((currentConversations) =>
        currentConversations.filter((conversation) => conversation.id !== conversationId),
      )
    },
    [setConversations],
  )

  const summarizeConversationTitle = useCallback(
    async (conversationId: string) => {
      const { data } = await api.post<Conversation>(`/conversations/${conversationId}/summarize-title`)
      setConversations(
        (currentConversations) =>
          currentConversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, title: data.title, model_id: data.model_id } : conversation,
          ),
      )
      return data
    },
    [setConversations],
  )

  const upsertConversation = useCallback(
    (conversation: Conversation) => {
      setConversations((currentConversations) => {
        const existingConversation = currentConversations.find((item) => item.id === conversation.id)

        if (!existingConversation) {
          return [conversation, ...currentConversations]
        }

        return currentConversations.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                ...conversation,
              }
            : item,
        )
      })
    },
    [setConversations],
  )

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  return {
    conversations,
    loading,
    loadConversations,
    createConversation,
    deleteConversation,
    summarizeConversationTitle,
    upsertConversation,
  }
}
