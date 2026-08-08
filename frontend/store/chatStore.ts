import { create } from 'zustand'

import type { Conversation, Message } from '@/types'
import { usePreferencesStore } from '@/store/preferencesStore'

type ChatState = {
  conversations: Conversation[]
  messages: Message[]
  selectedModelId: string | null
  setConversations: (conversations: Conversation[] | ((conversations: Conversation[]) => Conversation[])) => void
  setMessages: (messages: Message[]) => void
  clearMessages: () => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updater: (message: Message) => Message) => void
  setSelectedModelId: (modelId: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: [],
  selectedModelId: usePreferencesStore.getState().selectedModelId,
  setConversations: (conversations) =>
    set((state) => ({
      conversations: typeof conversations === 'function' ? conversations(state.conversations) : conversations,
    })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (messageId, updater) =>
    set((state) => ({
      messages: state.messages.map((message) => (message.id === messageId ? updater(message) : message)),
    })),
  setSelectedModelId: (selectedModelId) => {
    usePreferencesStore.getState().setSelectedModelId(selectedModelId)
    set({ selectedModelId })
  },
}))
